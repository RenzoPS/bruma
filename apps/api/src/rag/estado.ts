import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { chunks, granos } from "../db/schema.ts";
import { huellaDeFicha } from "./chunking.ts";
import { MODELO } from "./embeddings.ts";

/**
 * Si el índice vectorial sirve para el modelo que estamos usando hoy.
 *
 * `chunks.modelo_embedding` existe para poder contestar esta pregunta, y
 * guardarlo sin que nadie lo mire no arregla nada: el problema que la columna
 * venía a resolver es un fallo **silencioso**. Cambiar `MODELO` y olvidarse de
 * reindexar no rompe la búsqueda — la empeora sin avisar, porque un vector de
 * un modelo no es comparable con el de otro aunque tenga la misma cantidad de
 * números.
 *
 * Se chequea al arrancar el proceso y no en cada búsqueda: es una consulta que
 * no cambia mientras el servidor vive, y el momento en que esto se rompe es
 * exactamente un deploy. Tampoco va en `/healthz`, que el keep-alive pinguea
 * cada pocos minutos las veinticuatro horas y se mantiene sin tocar la base.
 *
 * Avisa, no rompe. Un índice viejo devuelve resultados peores pero devuelve
 * algo, y tirar abajo el sitio entero por eso sería peor que el problema.
 *
 * Chequea dos cosas, y las dos son la misma clase de falla —degradar en
 * silencio— por dos causas distintas: que el modelo haya cambiado, y que las
 * fichas hayan cambiado. La segunda es la más probable de las dos.
 */
export async function revisarIndice() {
  const filas = await db.execute<{ modelo_embedding: string; cuantos: number }>(
    sql`SELECT modelo_embedding, count(*)::int AS cuantos FROM chunks GROUP BY modelo_embedding`,
  );
  const modelos = Array.from(filas);

  if (modelos.length === 0) {
    console.warn(
      "El índice vectorial está vacío: Brumita no va a poder responder nada de las fichas.\n" +
        "Corré `pnpm rag:ingest`.",
    );
    return;
  }

  const ajenos = modelos.filter((m) => m.modelo_embedding !== MODELO);
  if (ajenos.length > 0) {
    const detalle = ajenos.map((m) => `${m.cuantos} con "${m.modelo_embedding}"`).join(", ");
    console.warn(
      `El índice tiene chunks de otro modelo de embeddings (${detalle}), y se está usando "${MODELO}".\n` +
        "Los vectores de modelos distintos no son comparables: la búsqueda va a recuperar peor sin fallar.\n" +
        "Corré `pnpm rag:ingest` para reconstruirlo.",
    );
  }

  await revisarFichas();
}

/**
 * Si el índice se generó con las fichas que hay hoy.
 *
 * El caso real: alguien corrige una ficha, corre `db:maestros` y se olvida de
 * `rag:ingest`. El chunk viejo sigue ahí y Brumita contesta con el texto
 * anterior, sin ningún síntoma. Comparar la huella lo convierte en un aviso.
 *
 * Se compara contra un solo chunk por grano: todos los de una ficha se generan
 * juntos y llevan la misma huella.
 */
async function revisarFichas() {
  const filas = await db
    .select({ clave: granos.clave, ficha: granos.ficha, guardada: chunks.fichaHash })
    .from(granos)
    .innerJoin(chunks, eq(chunks.granoId, granos.id))
    .where(eq(chunks.posicion, 0));

  const viejas = filas.filter((f) => f.guardada !== huellaDeFicha(f.ficha));

  if (viejas.length > 0) {
    console.warn(
      `El índice no corresponde a las fichas actuales de: ${viejas.map((v) => v.clave).join(", ")}.\n` +
        "Cambió el texto de la ficha o los parámetros de corte, y los chunks son los de antes:\n" +
        "Brumita va a contestar con contenido viejo sin dar ningún síntoma.\n" +
        "Corré `pnpm rag:ingest` para reconstruirlo.",
    );
  }

  const sinIndexar = await db
    .select({ clave: granos.clave })
    .from(granos)
    .where(sql`not exists (select 1 from chunks c where c.grano_id = ${granos.id})`);

  if (sinIndexar.length > 0) {
    console.warn(
      `Estos granos no tienen ningún chunk indexado: ${sinIndexar.map((g) => g.clave).join(", ")}.\n` +
        "Corré `pnpm rag:ingest`.",
    );
  }
}
