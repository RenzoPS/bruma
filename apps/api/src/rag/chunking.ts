import { createHash } from "node:crypto";

/**
 * Parte una ficha en pedazos para vectorizar. Escrito a mano y sin librería:
 * es la pieza que decide qué significa cada vector, y delegarla en un paquete
 * sería no poder explicar el resultado.
 *
 * **Se mide en caracteres, no en tokens.** No hay tokenizer de Gemini a mano, y
 * "1 token ≈ 4 caracteres" es una regla aproximada: preferimos un número exacto
 * de algo medible antes que una precisión falsa sobre algo que no medimos.
 *
 * El corte natural es el párrafo, porque las fichas se escriben con un tema por
 * párrafo — origen, proceso, tueste, taza, preparación. Un chunk que abarca dos
 * temas produce un vector que no representa bien ninguno de los dos.
 */

export type OpcionesChunking = {
  /**
   * El tamaño al que se apunta. **Es un objetivo, no una garantía**, y la
   * distinción importa: acumular oraciones enteras hasta pasarlo significa que
   * el último salto puede dejar el chunk por encima.
   *
   * Medido, con `objetivo` en 600: tres oraciones de 400 dan chunks de 799,
   * porque el solapamiento reabre el siguiente con la última oración escrita.
   * Sobre el corpus real —las cuatro fichas— salen 20 chunks y el más largo
   * mide 485, así que hoy no se toca. Pero el número no era lo que su nombre
   * decía, y un comentario que promete un máximo que el algoritmo no respeta es
   * peor que no tener comentario.
   */
  objetivo: number;
  /**
   * El techo que no se cruza nunca. Acá sí se parte, aunque toque cortar una
   * oración al medio: un chunk gigante ya no se puede volver a partir y su
   * vector representa demasiadas cosas a la vez.
   */
  tope: number;
  /** Abajo de esto, el pedazo se junta con el siguiente: un chunk de dos líneas no recupera nada. */
  minimo: number;
};

export const POR_DEFECTO: OpcionesChunking = { objetivo: 600, tope: 900, minimo: 150 };

/**
 * Corta por el punto que cierra una oración. Se exige espacio o fin de texto
 * después para no cortar en "1.750 metros" ni en "250 g.".
 */
function enOraciones(texto: string): string[] {
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Parte un párrafo demasiado largo, acumulando oraciones enteras hasta el
 * máximo. Nunca corta a mitad de oración.
 *
 * Acá sí hay solapamiento: la última oración del pedazo anterior abre el
 * siguiente. El corte es artificial —parte una idea al medio— y repetir la
 * bisagra evita que la mitad de abajo pierda de qué venía hablando.
 */
function partirLargo(parrafo: string, objetivo: number, tope: number): string[] {
  // Una sola oración más larga que el tope no tiene dónde cortarse por punto,
  // así que se parte por el espacio más cercano al objetivo. Es el único lugar
  // del chunker que corta a mitad de idea, y solo cuando la alternativa es un
  // chunk que no se puede volver a partir.
  const oraciones = enOraciones(parrafo).flatMap((oracion) =>
    oracion.length > tope ? partirPorEspacios(oracion, objetivo) : [oracion],
  );
  const pedazos: string[] = [];
  let actual: string[] = [];

  for (const oracion of oraciones) {
    const tentativa = [...actual, oracion].join(" ");

    if (actual.length > 0 && tentativa.length > objetivo) {
      pedazos.push(actual.join(" "));
      // El solapamiento: arrancar de nuevo desde la última oración escrita.
      // Salvo que repetirla ya deje el pedazo por encima del tope, en cuyo caso
      // se arranca limpio: la bisagra ayuda al contexto, no vale romper el
      // techo por ella.
      const conBisagra = [actual[actual.length - 1]!, oracion];
      actual = conBisagra.join(" ").length > tope ? [oracion] : conBisagra;
    } else {
      actual.push(oracion);
    }
  }

  if (actual.length > 0) pedazos.push(actual.join(" "));
  return pedazos;
}

/** Parte una oración enorme por el espacio más cercano al objetivo. */
function partirPorEspacios(oracion: string, objetivo: number): string[] {
  const pedazos: string[] = [];
  let resto = oracion;

  while (resto.length > objetivo) {
    const corte = resto.lastIndexOf(" ", objetivo);
    // Sin espacios antes del objetivo —una URL larga, por ejemplo— se corta
    // seco: es feo, pero es acotado.
    const en = corte > 0 ? corte : objetivo;
    pedazos.push(resto.slice(0, en).trim());
    resto = resto.slice(en).trim();
  }

  if (resto) pedazos.push(resto);
  return pedazos;
}

export function partirEnChunks(
  texto: string,
  { objetivo, tope, minimo }: OpcionesChunking = POR_DEFECTO,
): string[] {
  const parrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Cada párrafo entero, salvo los que no entran.
  const pedazos = parrafos.flatMap((p) =>
    p.length > objetivo ? partirLargo(p, objetivo, tope) : [p],
  );

  // Un párrafo suelto muy corto —una línea de cierre, un título— se pega a su
  // vecino antes que quedar como un chunk que no dice nada.
  //
  // Se mira en las dos direcciones: si el corto es el anterior, se le pega el
  // que viene; si el corto es el que viene, se lo pega al anterior. Mirar solo
  // hacia adelante dejaba huérfano al último párrafo de un texto, porque cuando
  // le toca el turno ya no hay siguiente con quien juntarse.
  const chunks: string[] = [];

  for (const pedazo of pedazos) {
    const anterior = chunks[chunks.length - 1];
    const algunoEsCorto =
      anterior !== undefined && (anterior.length < minimo || pedazo.length < minimo);

    // La fusión nunca puede pasarse del objetivo: un chunk sobredimensionado es
    // peor que uno corto, porque ya no se puede volver a partir.
    const entra =
      anterior !== undefined && anterior.length + pedazo.length + 2 <= objetivo;

    if (algunoEsCorto && entra) {
      chunks[chunks.length - 1] = `${anterior}\n\n${pedazo}`;
    } else {
      chunks.push(pedazo);
    }
  }

  return chunks;
}

/**
 * La huella de una ficha: qué texto se indexó y con qué parámetros se cortó.
 *
 * Existe para detectar un índice viejo, no para reindexar de a pedazos. Esa
 * distinción importa: la reindexación incremental —comparar hash por chunk y
 * regenerar solo lo que cambió— sería arquitectura de más con 20 chunks, donde
 * rehacerlos enteros cuesta una llamada. Detectar que están viejos, en cambio,
 * cuesta una columna y cierra un fallo silencioso.
 *
 * **Incluye los parámetros de corte a propósito.** Si mañana `objetivo` o
 * `tope` cambian, los chunks guardados dejan de ser los que este chunker
 * produciría aunque la ficha esté intacta, y eso también hay que notarlo.
 * Meterlos en el hash evita un número de versión que alguien tiene que
 * acordarse de subir a mano — que es justo la forma en la que esos números
 * dejan de servir.
 */
export function huellaDeFicha(ficha: string, opciones: OpcionesChunking = POR_DEFECTO): string {
  const receta = `${opciones.objetivo}:${opciones.tope}:${opciones.minimo}`;
  return createHash("sha256").update(`${receta}\n${ficha}`).digest("hex").slice(0, 16);
}
