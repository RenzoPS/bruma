/**
 * Los logs estructurados de la API.
 *
 * El proyecto medía el retrieval y el ruteo en los tests, pero en producción no
 * dejaba rastro de nada: qué tool corrió, con qué argumentos, cuánto tardó,
 * cuántos chunks recuperó, si el modelo primario contestó o hubo que ir al
 * respaldo. Cuando el chat contesta mal, esa es exactamente la información que
 * hace falta, y sin ella el único método es reproducirlo a mano.
 *
 * **Es JSON en una línea a stdout, y eso es la decisión.** Ni un SDK de
 * observabilidad ni un archivo: los hosts donde esto va a correr —Render, Cloud
 * Run— recolectan stdout y lo parsean solos si es JSON. Una pieza más que se
 * puede caer, para un sitio de portfolio, cuesta más de lo que ahorra. Si algún
 * día hace falta OpenTelemetry, el lugar donde enchufarlo es este archivo y no
 * cincuenta llamadas repartidas.
 *
 * Lo que NO se registra, a propósito:
 *
 * - **El texto de la pregunta del visitante.** Es dato de una persona y no hace
 *   falta para diagnosticar el ruteo: alcanza con saber qué tool eligió y con
 *   qué argumentos. Lo que sí va es el largo, que es lo que explica una latencia
 *   rara sin guardar lo que alguien escribió.
 * - **El texto de la respuesta.** Misma razón, y además ya está del lado del
 *   visitante.
 * - **La IP.** El límite por IP la usa en memoria y no necesita persistirla.
 */

import { AsyncLocalStorage } from "node:async_hooks";

type Nivel = "info" | "warn" | "error";

/** Los campos que lleva cualquier evento. El resto lo pone quien lo emite. */
type Evento = {
  evento: string;
  [clave: string]: unknown;
};

/**
 * El id de la pregunta en curso, sin pasarlo por parámetro.
 *
 * Una tool corre tres capas abajo de la ruta —Express, el SDK, el modelo— y
 * ninguna de esas capas es nuestra: no hay por dónde pasarle un argumento. La
 * alternativa a esto era una variable global, que se pisa con dos preguntas
 * simultáneas, o no correlacionar nada, que es lo que había.
 *
 * `AsyncLocalStorage` es de Node, no una dependencia, y es exactamente para
 * esto: el valor viaja con la cadena de callbacks asíncronos de un request y no
 * lo ve ningún otro.
 */
const contexto = new AsyncLocalStorage<{ rastro: string }>();

/** Corre `tarea` con un id de rastro que todos los logs de adentro heredan. */
export function conRastro<T>(rastro: string, tarea: () => T): T {
  return contexto.run({ rastro }, tarea);
}

/**
 * Los scripts apagan el log, y no es por prolijidad.
 *
 * `rag:evaluar` y `rag:calibrar` producen un informe: su salida ES el
 * resultado. Con los eventos de cada tool intercalados, la tabla de puntajes
 * queda ilegible y hay que filtrarla con grep para leerla, que es justo lo que
 * un informe no debería pedir.
 *
 * Se apaga desde el entorno y no con un parámetro porque quien emite un log
 * —una tool, tres capas abajo— no tiene por qué saber si lo llamó un servidor o
 * un script.
 */
const CALLADO = process.env.BRUMA_LOG === "silencioso";

function emitir(nivel: Nivel, evento: Evento) {
  if (CALLADO) return;

  const linea = JSON.stringify({
    ts: new Date().toISOString(),
    nivel,
    // Afuera de un request —el chequeo del índice al arrancar, por ejemplo— no
    // hay rastro, y la clave simplemente no aparece.
    ...contexto.getStore(),
    ...evento,
  });

  // console.error para warn y error: van a stderr, que es donde los hosts los
  // separan del ruido normal sin tener que leer el campo `nivel`.
  if (nivel === "info") console.log(linea);
  else console.error(linea);
}

export const registro = {
  info: (evento: Evento) => emitir("info", evento),
  warn: (evento: Evento) => emitir("warn", evento),
  error: (evento: Evento) => emitir("error", evento),
};

/**
 * Un id corto para atar los eventos de una misma pregunta.
 *
 * Corto y no un UUID: no se persiste ni se cruza entre servicios, solo agrupa
 * las cinco o seis líneas de una conversación adentro del mismo log. Ocho
 * caracteres hex son 4.300 millones de valores, de sobra para que dos preguntas
 * simultáneas no se confundan.
 */
export const nuevoRastro = () => Math.random().toString(16).slice(2, 10);

/** Milisegundos enteros desde una marca de `performance.now()`. */
export const desde = (marca: number) => Math.round(performance.now() - marca);
