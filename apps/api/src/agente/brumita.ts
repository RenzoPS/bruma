import { google } from "@ai-sdk/google";
import { isStepCount, streamText, wrapLanguageModel, type ModelMessage } from "ai";
import { herramientas } from "./herramientas.ts";
import { INSTRUCCIONES, directivaDeIdioma } from "./prompt.ts";

/**
 * Brumita: el prompt, las tools y el modelo, en un solo lugar.
 *
 * La ruta no sabe nada de esto y este archivo no sabe nada de Express: se puede
 * probar la conversación sin levantar un servidor, que es lo que hace
 * tests/integracion/brumita.test.ts.
 */

/**
 * El modelo está fijado, y no por costumbre: se probó el alias y no sirve.
 *
 * `gemini-flash-latest` sigue al flash vigente de Google, que hoy es
 * `gemini-3.7-flash`. Ese modelo tiene una cuota gratuita de **20 requests por
 * día** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, medido contra la
 * API: la suite de guardrails la agota en una sola corrida y devuelve 429). Un
 * sitio de portfolio que se cae después de veinte preguntas no funciona.
 *
 * `gemini-2.5-flash` tampoco es opción: la API responde 404 con "no longer
 * available to new users".
 *
 * Se usa un flash-lite, que es donde vive la cuota gratuita usable. La contra
 * de fijarlo es la de siempre —dentro de un año esto corre contra un modelo
 * viejo—, así que queda escrito qué mirar para moverlo: **la cuota gratuita del
 * modelo, no su fecha**. El flash más nuevo suele ser el que menos deja pasar.
 */
const MODELO = "gemini-3.5-flash-lite";

/**
 * El de la generación anterior, para cuando el primario devuelve 429 o 404.
 *
 * Estable, no `preview`. La lista de ids que tipa `@ai-sdk/google` trae el 3.1
 * flash-lite solo con sufijo `-preview`, y por eso estuvo un rato ese acá — mal:
 * esa lista es la del SDK, no la de la API. Probado contra la API, el id sin
 * sufijo existe y responde con tools en ~2,6s. Un `preview` no va de red de
 * seguridad: es justo el que puede cambiar o desaparecer sin aviso.
 */
const RESPALDO = "gemini-3.1-flash-lite";

/**
 * Cuántos turnos de tool puede encadenar antes de tener que contestar.
 *
 * Una pregunta que cruza carta y ficha —"¿cuál me recomendás para prensa y
 * cuánto sale?"— necesita dos llamadas y después la respuesta. Cinco deja
 * margen para una corrección sin abrir la puerta a que se quede dando vueltas
 * consumiendo cuota.
 */
const PASOS = 5;

/**
 * Los códigos por los que vale la pena cambiar de modelo — y **503 no es uno**.
 *
 * 404 es un modelo dado de baja y 429 es cuota agotada: en los dos casos
 * insistir con el primario no lo va a arreglar, así que se cambia.
 *
 * 503 es sobrecarga temporal, y ahí cambiar de modelo es peor que esperar.
 * Medido: los dos modelos responden en pocos segundos cuando están sanos y se
 * recuperan solos de un 503, pero cambiar cuesta el viaje entero de nuevo. La
 * primera versión de esto trataba el 503 como motivo de cambio y una pregunta
 * simple, que sana tarda 0,7 s, se fue a 67 s.
 *
 * Cualquier otro error —una API key inválida, un prompt mal armado— se propaga:
 * cambiar de modelo no lo arregla y taparlo sería esconder el problema.
 */
const CODIGOS_DE_RESPALDO = new Set([404, 429]);

/**
 * Cuanto se deja de intentar con el primario, segun por que se cayo.
 *
 * Sin esto, cada paso de la misma conversacion vuelve a pegarle a un modelo que
 * ya sabemos que no esta y vuelve a pagar el backoff.
 *
 * Los dos motivos no duran lo mismo y antes compartian un minuto para los dos,
 * que no tenia sentido para ninguno: una cuota diaria no se abre en sesenta
 * segundos, y un modelo dado de baja no vuelve nunca.
 *
 * Es un breaker **en proceso**, no distribuido: con varias replicas cada una
 * tiene el suyo y descubre la caida por su cuenta. A esta escala esta bien, y
 * meter Redis para compartirlo costaria mas de lo que ahorra.
 */
const ENFRIAMIENTO_MS: Record<number, number> = {
  // Cuota diaria agotada: no se recupera en un minuto, pero tampoco conviene
  // dar por muerto el modelo hasta el reinicio. Media hora es el punto medio.
  429: 30 * 60 * 1000,
  // Modelo dado de baja: no vuelve. Se descarta hasta que alguien reinicie el
  // proceso con otro id — que es la acción que corresponde, y esperar un minuto
  // para volver a pedirle a un modelo que ya no existe es solo latencia.
  404: Number.POSITIVE_INFINITY,
};

let primarioCaidoDesde = 0;
let primarioCaidoPor = 0;

const primarioEnPie = () =>
  Date.now() - primarioCaidoDesde > (ENFRIAMIENTO_MS[primarioCaidoPor] ?? 0);

/** El codigo del error, buscando una o dos capas abajo del RetryError. */
function codigoDe(error: unknown): number | undefined {
  for (let capa: unknown = error, i = 0; capa && i < 4; i++) {
    const codigo = (capa as { statusCode?: number }).statusCode;
    if (typeof codigo === "number") return codigo;
    capa = (capa as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * El primario con el de respaldo detrás.
 *
 * Va como middleware del SDK y no como un try/catch en la ruta a propósito: acá
 * el cambio ocurre antes de que salga el primer byte al visitante. Envuelto más
 * arriba, la respuesta ya habría empezado a streamear y no habría forma de
 * rebobinarla.
 *
 * **Lo que esto NO cubre**, y conviene que esté escrito: el `catch` agarra los
 * errores que tira `doStream()` al abrir la llamada. Un error que aparezca a
 * mitad de la generación, con el stream ya andando, no pasa por acá — lo
 * atiende el `onError` de la ruta, que le manda al visitante un mensaje y le
 * ofrece reintentar. El fallback es para "el modelo no me atendió", no para
 * "el modelo se cortó a la mitad".
 */
const modelo = wrapLanguageModel({
  model: google(MODELO),
  middleware: {
    wrapStream: async ({ doStream, params }) => {
      // Si el primario se cayo hace poco, se va derecho al respaldo en vez de
      // volver a esperar su timeout.
      if (!primarioEnPie()) return google(RESPALDO).doStream(params);

      try {
        return await doStream();
      } catch (error) {
        const codigo = codigoDe(error);
        if (codigo === undefined || !CODIGOS_DE_RESPALDO.has(codigo)) throw error;
        primarioCaidoDesde = Date.now();
        primarioCaidoPor = codigo;
        console.warn(`${MODELO} no respondió, se reintenta con ${RESPALDO}`);
        return google(RESPALDO).doStream(params);
      }
    },
  },
});

export function responder(mensajes: ModelMessage[], idioma: "es" | "en" = "es") {
  return streamText({
    model: modelo,
    // La directiva va al final y no al principio: es la ultima linea del
    // prompt de sistema, que es donde mas pesa.
    instructions: `${INSTRUCCIONES}\n\n${directivaDeIdioma(idioma)}`,
    messages: mensajes,
    tools: herramientas,
    stopWhen: isStepCount(PASOS),
    // Los reintentos del SDK son la defensa contra el 503, que es el error
    // frecuente y del que el primario se recupera solo. El backoff exponencial
    // arranca en 2s: dos intentos alcanzan y son mas rapidos que irse a un
    // modelo que tarda medio minuto.
    maxRetries: 2,
    // Cero, no bajo: esto no escribe, recita lo que devolvieron las tools.
    //
    // Pero temperatura cero **no** es lo que impide que invente. Reduce la
    // variabilidad, nada más: un modelo determinístico puede alucinar el mismo
    // precio inventado todas las veces. Lo que sostiene el grounding es que las
    // tools sean la única fuente, que devuelvan vacío cuando no hay dato, que
    // el prompt diga explícitamente que se conteste "no lo tengo", y los tests
    // de guardrails que verifican las tres cosas.
    temperature: 0,
  });
}
