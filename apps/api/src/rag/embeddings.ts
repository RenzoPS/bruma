import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { DIMENSIONES_EMBEDDING } from "../dominio.ts";

/**
 * Todo lo que habla con el modelo de embeddings pasa por acá.
 *
 * El modelo y la dimensión son un solo par acoplado: un vector generado con
 * `gemini-embedding-001` no es comparable con uno de otro modelo, aunque tenga
 * la misma cantidad de números. Si esto cambia, hay que reindexar todo — no
 * alcanza con cambiar la constante.
 */

export const MODELO = "gemini-embedding-001";

/** Reexportada para que el resto del RAG no tenga que saber de dónde sale. */
export const DIMENSIONES = DIMENSIONES_EMBEDDING;

/**
 * Google entrena el modelo para que un documento y la pregunta que debería
 * encontrarlo caigan cerca, pero solo si cada lado declara qué es. Embeber los
 * dos como texto genérico recupera peor.
 */
type Tarea = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const opciones = (taskType: Tarea) => ({
  google: { outputDimensionality: DIMENSIONES, taskType },
});

/** Para lo que se guarda: los chunks de las fichas. */
export async function embeberDocumentos(textos: string[]): Promise<number[][]> {
  const { embeddings } = await enTurno(() =>
    embedMany({
      model: google.embedding(MODELO),
      values: textos,
      providerOptions: opciones("RETRIEVAL_DOCUMENT"),
      maxRetries: REINTENTOS,
    }),
  );

  verificar(embeddings, textos.length);
  return embeddings;
}

/**
 * Un turno por vez, con un hueco mínimo entre llamadas.
 *
 * El límite que se toca primero con este modelo no es el diario ni el de
 * tokens: es `global_embed_content_requests_per_minute_per_base_model`, o sea
 * **pedidos por minuto**, y la palabra `global` no es decorativa — es una cuota
 * del free tier que no pertenece solo a este proyecto. Medido: se agota con una
 * ráfaga secuencial de ~25 consultas y se recupera en menos de un minuto.
 *
 * Una pregunta suelta de un visitante no espera nada: `ultima` arranca en cero,
 * así que el primer pedido pasa derecho y el hueco solo aparece cuando hay otro
 * pegado atrás. Los que sí hacen ráfaga son `pnpm rag:calibrar` y la suite de
 * integración, que disparan sus casos en fila.
 *
 * Precisión sobre qué mide el hueco: va **entre arranques**, no entre el fin de
 * una llamada y el inicio de la siguiente. Como la cola es secuencial, una
 * llamada que tarda más que el hueco hace que la próxima salga apenas termina.
 * Es lo correcto para una cuota que cuenta pedidos por minuto, pero no es lo
 * que "un hueco entre llamadas" sugiere a primera vista.
 */
const HUECO_MS = 1_500;

/**
 * Reintentos ante un 429. El default del SDK son 2, con backoff exponencial
 * arrancando en 2s; con 4 la espera acumulada llega a la media docena de
 * decenas de segundos, que es lo que tarda en abrirse la ventana del minuto.
 *
 * Espaciar solo no alcanza: la cuota es **global** del free tier, así que otro
 * proyecto puede tenerla tomada cuando llega nuestro turno y no hay hueco
 * propio que lo evite. Contra eso la defensa es esperar, no ir más lento.
 */
const REINTENTOS = 4;
let ultima = 0;
let cola: Promise<unknown> = Promise.resolve();

function enTurno<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = cola.then(async () => {
    const faltan = HUECO_MS - (Date.now() - ultima);
    if (faltan > 0) await new Promise((listo) => setTimeout(listo, faltan));
    ultima = Date.now();
    return tarea();
  });
  // La cola no se corta cuando una llamada falla: si el catch no estuviera, un
  // 429 dejaría rechazada la promesa de la cola y todas las siguientes.
  cola = turno.catch(() => {});
  return turno;
}

/**
 * Caché de preguntas ya embebidas: la otra mitad de la defensa de cuota que
 * pide el spec, y la que ahorra el pedido en vez de espaciarlo.
 *
 * Lo que se repite en producción es el visitante: las preguntas sugeridas del
 * front son cuatro y son las que más se van a tocar, y dos personas que
 * escriben lo mismo generan el mismo vector. Un embedding es determinístico
 * para un texto y un modelo dados, así que cachearlo no puede devolver algo
 * desactualizado — no hay nada acá que envejezca.
 *
 * Es un Map en el proceso y no Redis: se pierde al reiniciar, que es
 * exactamente lo que tiene que pasar, y a esta escala una pieza más que se
 * pueda caer costaría más de lo que ahorra.
 */
const CACHE_MAXIMO = 500;
const cache = new Map<string, number[]>();

const clave = (texto: string) => texto.trim().toLowerCase();

/** Para lo que se busca: la pregunta del visitante. */
export async function embeberConsulta(texto: string): Promise<number[]> {
  const enCache = cache.get(clave(texto));
  if (enCache) return enCache;

  const { embedding } = await enTurno(() =>
    embed({
      model: google.embedding(MODELO),
      value: texto,
      providerOptions: opciones("RETRIEVAL_QUERY"),
      maxRetries: REINTENTOS,
    }),
  );

  verificar([embedding], 1);

  // Desalojo por antigüedad de inserción: el primer keys().next() de un Map es
  // el más viejo. No es un LRU —una entrada muy usada igual se cae cuando le
  // toca— y para 500 preguntas distintas la diferencia no se nota.
  if (cache.size >= CACHE_MAXIMO) {
    const masVieja = cache.keys().next().value;
    if (masVieja !== undefined) cache.delete(masVieja);
  }
  cache.set(clave(texto), embedding);

  return embedding;
}

/**
 * Un vector de la dimensión equivocada entra igual en la columna y falla
 * después, al comparar. Mejor romper acá, donde el error dice qué pasó.
 */
function verificar(embeddings: number[][], esperados: number) {
  if (embeddings.length !== esperados) {
    throw new Error(`Gemini devolvió ${embeddings.length} vectores y se esperaban ${esperados}`);
  }

  // Se revisan todos y no solo el primero. Mirar el [0] daba una sensación de
  // control que el código no tenía: si el proveedor devolviera un lote con una
  // fila corta, entraba igual y fallaba después, al comparar, lejos de acá.
  // Recorrer 20 vectores cuesta nada.
  for (const [i, embedding] of embeddings.entries()) {
    if (embedding.length !== DIMENSIONES) {
      throw new Error(
        `Gemini devolvió un vector de ${embedding.length} dimensiones (el ${i}), el esquema espera ${DIMENSIONES}`,
      );
    }
    // NaN e Infinity entran en la columna sin protestar y envenenan la
    // distancia: un solo valor no finito hace que ese chunk compare mal contra
    // todo y nadie se entera.
    const malo = embedding.findIndex((valor) => !Number.isFinite(valor));
    if (malo !== -1) {
      throw new Error(`El vector ${i} trae un valor no finito en la posición ${malo}`);
    }
  }
}
