import { eq } from "drizzle-orm";
import { conexion, db } from "../db/client.ts";
import { chunks, granos } from "../db/schema.ts";
import { huellaDeFicha, partirEnChunks } from "../rag/chunking.ts";
import { DIMENSIONES, MODELO, embeberDocumentos } from "../rag/embeddings.ts";

/**
 * Convierte las fichas de grano en vectores buscables.
 *
 * Corre a mano (`pnpm rag:ingest`), nunca en un request ni al arrancar el stack:
 * llama a la API de Gemini, así que gasta cuota, tarda y necesita red. Los
 * vectores de una ficha que no cambió son idénticos a los de ayer, y pagarlos
 * de nuevo en cada `docker compose up` no compra nada.
 *
 * Reindexar es borrar y volver a generar, no actualizar. Un chunk no tiene
 * identidad estable: si se corrige un párrafo, los cortes se corren y ya no hay
 * forma de saber qué chunk viejo corresponde a cuál nuevo. A esta escala,
 * rehacerlos cuesta una llamada.
 */

async function main() {
  const fichas = await db
    .select({ id: granos.id, clave: granos.clave, ficha: granos.ficha })
    .from(granos);

  if (fichas.length === 0) {
    throw new Error("No hay granos en la base. Corré `pnpm db:maestros` antes de ingestar.");
  }

  // Se parte todo primero para poder pedir los embeddings de una sola vez.
  // La posicion sale del orden en que `partirEnChunks` devolvio los pedazos,
  // que es el orden del texto original. Es lo que despues permite pedir los
  // vecinos de un chunk sin volver a leer la ficha.
  const pedazos = fichas.flatMap((grano) =>
    partirEnChunks(grano.ficha).map((contenido, posicion) => ({
      granoId: grano.id,
      posicion,
      contenido,
      fichaHash: huellaDeFicha(grano.ficha),
    })),
  );

  console.log(`${fichas.length} fichas → ${pedazos.length} chunks`);

  // Una llamada para los 20, no 20 llamadas. embedMany parte solo si el
  // proveedor tiene un límite por request. La validación de cantidad y
  // dimensión vive en el módulo de embeddings.
  const embeddings = await embeberDocumentos(pedazos.map((p) => p.contenido));

  // Borrar y reescribir en una transacción: si algo falla, la base se queda con
  // los chunks viejos, que son consultables. Borrar primero y fallar después
  // dejaría a Brumita sin nada que recuperar.
  await db.transaction(async (tx) => {
    for (const grano of fichas) {
      await tx.delete(chunks).where(eq(chunks.granoId, grano.id));
    }

    await tx.insert(chunks).values(
      // El modelo queda escrito en cada fila: es lo que despues contesta
      // "¿este indice se genero con el modelo que estamos usando hoy?" sin
      // tener que adivinar.
      pedazos.map((pedazo, i) => ({
        ...pedazo,
        embedding: embeddings[i]!,
        modeloEmbedding: MODELO,
      })),
    );
  });

  console.log(`${pedazos.length} chunks indexados con ${MODELO} (${DIMENSIONES}d)`);
}

main()
  .then(() => conexion.end())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await conexion.end();
    process.exit(1);
  });
