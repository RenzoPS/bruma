import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { chunks, granos } from "../db/schema.ts";
import { huellaDeFicha, partirEnChunks } from "./chunking.ts";
import { DIMENSIONES, MODELO, embeberDocumentos } from "./embeddings.ts";

/**
 * Reconstruye el índice vectorial a partir de las fichas que hay en la base.
 *
 * Vive en un módulo y no adentro del script porque es una operación del dominio
 * —"poné el índice al día"— y no la línea de comandos que la dispara. El script
 * queda como lo que es: parseo de argumentos, un console.log y cerrar la
 * conexión. Esto además se puede llamar desde un test sin levantar un proceso.
 *
 * La primera versión de esta separación quedó a medio hacer y fue peor que no
 * haberla empezado: el módulo existía, el script seguía teniendo el algoritmo
 * copiado, y el comentario de acá arriba prometía que la duplicación estaba
 * resuelta. Dos copias de un algoritmo divergen; dos copias con un cartel que
 * dice que no hay dos copias divergen sin que nadie lo mire.
 *
 * Reindexar es borrar y volver a generar, no actualizar. Un chunk no tiene
 * identidad estable: si se corrige un párrafo, los cortes se corren y ya no hay
 * forma de saber qué chunk viejo corresponde a cuál nuevo. A esta escala,
 * rehacerlos cuesta una llamada.
 */
export async function reconstruirIndice() {
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
  return { fichas: fichas.length, chunks: pedazos.length };
}
