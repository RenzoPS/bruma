import { tool } from "ai";
import { z } from "zod";
import {
  buscarProductos,
  horariosYUbicacion,
  verGranos,
} from "../services/catalogo.service.ts";
import { buscarEnFichas } from "../rag/retrieval.ts";
import { CATEGORIAS, GRAMOS_POR_BOLSA, PERFILES, PROCESOS } from "../dominio.ts";
import { desde, registro } from "../lib/registro.ts";

/**
 * La whitelist: las únicas cuatro cosas que Brumita puede hacer.
 *
 * Acá está la decisión central del proyecto. El modelo **no escribe SQL**:
 * elige una de estas funciones y le pasa argumentos, que Zod valida antes de
 * que toquen la base. No hay superficie de inyección porque no hay nada
 * generado que ejecutar — no hace falta una lista negra de palabras prohibidas,
 * porque no hay texto libre llegando a la consulta.
 *
 * El ruteo tampoco es un `if` nuestro. Se declaran las cuatro y el modelo elige;
 * eso deja la decisión explícita y auditable, y es lo que el front muestra
 * abajo de cada respuesta. Hacer visible el mecanismo es medio punto de esto.
 *
 * **Las descripciones son código.** Son literalmente lo que decide si una
 * pregunta de precio va a la carta o al retrieval vectorial, así que dicen
 * cuándo usar cada una y no qué devuelve cada una.
 */

const categoria = z
  .enum(CATEGORIAS)
  .describe("cafe: bebidas de barra. acompanar: pastelería y salados. desayuno: combos. grano: bolsas para llevar");

const precioMaximo = z
  .number()
  .positive()
  .describe("Tope en pesos, como lo diría una persona. No en centavos");

/**
 * Los esquemas, aparte de las tools.
 *
 * `tool()` tipa su `inputSchema` como un union de formatos aceptados (Zod,
 * JSON Schema, Valibot), asi que leerlo de vuelta desde la tool no da un objeto
 * Zod: da el union, y no se le puede pedir un safeParse. Declararlos acá deja
 * que tests/herramientas.test.ts valide exactamente lo que valida producción.
 */
export const ESQUEMAS = {
  buscarProductos: z.object({
    categoria: categoria.optional(),
    precioMaximo: precioMaximo.optional(),
    soloDisponibles: z
      .boolean()
      .optional()
      .describe("Por defecto true. Ponelo en false solo si preguntan explícitamente por algo que ya no está"),
  }),

  verGranos: z.object({
    proceso: z
      .enum(PROCESOS)
      .optional()
      .describe("Cómo se benefició el grano después de cosechado"),
    perfil: z.enum(PERFILES).optional().describe("Punto de tueste"),
    precioMaximo: precioMaximo.optional(),
    soloConStock: z.boolean().optional().describe("Por defecto false"),
  }),

  buscarEnFichas: z.object({
    consulta: z
      .string()
      .min(3)
      .max(400)
      .describe("La pregunta en las palabras del visitante, no una keyword suelta: la búsqueda es semántica"),
  }),

  // Gemini pide un esquema de objeto igual cuando la función no lleva
  // argumentos; un objeto vacío es la forma de decir "ninguno".
  horariosYUbicacion: z.object({}),
};

/**
 * Envuelve el `execute` de una tool para dejar rastro de que corrió.
 *
 * Va acá y no adentro de cada servicio porque **el ruteo es lo que hay que
 * observar**: cuál eligió el modelo, con qué argumentos y cuánto devolvió. Un
 * log adentro de `buscarProductos` contaría que se consultó la carta, pero no
 * que la pregunta era de sabor y la carta era la tool equivocada.
 *
 * Los argumentos se registran enteros y sin filtrar. Se puede porque son
 * argumentos tipados de un enum o un número — no hay texto libre de una persona
 * ahí adentro. La excepción es `buscarEnFichas`, cuya `consulta` sí es lo que
 * escribió el visitante: esa se recorta a su largo, ver abajo.
 *
 * Si `execute` tira, el error se registra y se vuelve a lanzar: taparlo acá
 * dejaría al modelo creyendo que la tool devolvió vacío, que es una respuesta
 * distinta de "esto falló".
 */
function conRegistro<A, R>(nombre: string, ejecutar: (args: A) => Promise<R>) {
  return async (args: A): Promise<R> => {
    const marca = performance.now();
    try {
      const salida = await ejecutar(args);
      registro.info({
        evento: "tool",
        tool: nombre,
        args,
        ms: desde(marca),
        // Cuántas filas o chunks volvieron. Es la mitad del diagnóstico: una
        // tool que corre bien y devuelve cero es por qué Brumita dijo que no
        // sabía, y sin este número esa respuesta parece un capricho del modelo.
        resultados: Array.isArray(salida) ? salida.length : undefined,
      });
      return salida;
    } catch (error) {
      registro.error({
        evento: "tool",
        tool: nombre,
        args,
        ms: desde(marca),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

export const herramientas = {
  buscarProductos: tool({
    description:
      "La carta del local: qué se sirve, cuánto sale y qué está disponible hoy. " +
      "Usala para CUALQUIER pregunta de precio o de qué hay. Los precios son exactos y salen de acá, nunca de tu memoria. " +
      "Sin argumentos devuelve la carta entera.",
    inputSchema: ESQUEMAS.buscarProductos,
    execute: conRegistro("buscarProductos", ({ categoria, precioMaximo, soloDisponibles }) =>
      buscarProductos({ categoria, precioMaximo, soloDisponibles }),
    ),
  }),

  verGranos: tool({
    description:
      "Los atributos exactos de cada origen que BRUMA tuesta: proceso, perfil de tueste, altura, precio de la bolsa y stock. " +
      "Usala para filtrar y comparar orígenes ('¿cuál es el más claro?', '¿tenés alguno natural?', '¿cuánto sale la bolsa?'). " +
      "NO devuelve a qué saben: para eso está buscarEnFichas.",
    inputSchema: ESQUEMAS.verGranos,
    execute: conRegistro("verGranos", ({ proceso, perfil, precioMaximo, soloConStock }) =>
      verGranos({ proceso, perfil, precioMaximo, soloConStock }),
    ),
  }),

  buscarEnFichas: tool({
    description:
      "Busca en las fichas de los orígenes, que están escritas en prosa: a qué sabe cada grano, sus notas de cata, " +
      "de dónde viene, la finca, cómo prepararlo, para quién es. " +
      "Usala para todo lo que sea sabor, matiz o recomendación. Es lo único que no podés saber de antemano. " +
      "NO la uses para preguntar por precio, stock, proceso o perfil: para eso está verGranos. " +
      "Cada resultado igual trae el precio y el stock del grano que citás, para que no tengas que adivinarlos " +
      "cuando recomendás; un granoStock en false está agotado y no se ofrece como disponible. " +
      "Si no vuelve nada, no hay información propia sobre eso y tenés que decirlo.",
    inputSchema: ESQUEMAS.buscarEnFichas,
    // Se devuelve la similitud junto con el texto a propósito: el front la
    // muestra, y un chunk que entró raspando el umbral se ve distinto de uno
    // que entró cómodo.
    //
    // El `idioma` viaja con los chunks porque acá está el ancla: las fichas
    // están en castellano y son lo más reciente del contexto cuando el modelo
    // redacta, así que sin este aviso una respuesta en inglés se le escapaba al
    // castellano. Quién decide el idioma no es esto —eso lo fija
    // `directivaDeIdioma`—, esto solo avisa que la fuente no lo determina.
    execute: async ({ consulta }) => {
      const marca = performance.now();
      const chunks = await buscarEnFichas(consulta);

      // El único log que se escribe a mano en vez de con `conRegistro`, y por
      // dos motivos concretos.
      //
      // Uno: la `consulta` es texto que escribió una persona, así que no se
      // guarda — va su largo, que sirve para leer una latencia y no dice quién
      // preguntó qué.
      //
      // Dos: las similitudes son EL número de este proyecto. Un chunk que entró
      // en 0.61 y otro que entró en 0.83 dan la misma respuesta en el log de
      // arriba —"3 resultados"— y no son lo mismo: el primero está raspando el
      // umbral de 0.608 y es candidato a ser un falso positivo. Sin esto, la
      // única forma de saber si el umbral sigue bien calibrado en producción es
      // volver a correr `pnpm rag:calibrar` a ciegas.
      registro.info({
        evento: "tool",
        tool: "buscarEnFichas",
        largoConsulta: consulta.length,
        ms: desde(marca),
        resultados: chunks.length,
        similitudes: chunks.map((c) => Number(c.similitud.toFixed(3))),
        granos: [...new Set(chunks.map((c) => c.granoClave))],
      });

      return {
        idioma:
          "Estos textos están en castellano porque así está escrito el corpus. NO definen el idioma de tu respuesta: "
          + "seguí la instrucción de idioma del sistema y traducí el contenido si hace falta.",
        // Viaja acá porque al recomendar un grano se nombra la bolsa, y este
        // dato no estaba en ninguna tool: `rag:evaluar` agarró a Brumita
        // diciendo "la bolsa de 250 g" sin que nadie se lo hubiera dado.
        presentacion: `Cada origen se vende en bolsa de ${GRAMOS_POR_BOLSA} g.`,
        chunks,
      };
    },
  }),

  horariosYUbicacion: tool({
    description:
      "Dirección, horario de atención, cuántas mesas hay y si hay wifi. Usala para cualquier pregunta de cuándo o dónde.",
    inputSchema: ESQUEMAS.horariosYUbicacion,
    execute: conRegistro("horariosYUbicacion", async () => horariosYUbicacion()),
  }),
};

export type Herramientas = typeof herramientas;
