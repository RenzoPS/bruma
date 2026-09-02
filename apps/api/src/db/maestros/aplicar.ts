import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { conexion, db } from "../client.ts";
import { granos, productos } from "../schema.ts";
import { GRANOS } from "./granos.ts";
import { PRODUCTOS } from "./productos.ts";

/**
 * Carga la carta y los orígenes de grano.
 *
 * No son datos de prueba: con estas tablas vacías Brumita no tiene qué
 * responder. Por eso se versionan junto al esquema y se aplican en todos los
 * entornos, producción incluida.
 *
 * Corre las veces que quieras: el ON CONFLICT sobre `clave` actualiza en vez de
 * duplicar. Es lo que permite que el compose lo ejecute en cada `up` sin que
 * nadie lleve la cuenta de si ya corrió.
 *
 * ## Qué pasa cuando algo desaparece del archivo
 *
 * **Nunca borra.** Sacar un producto de `PRODUCTOS` no lo saca de la base: la
 * fila queda. Retirar algo del mostrador es `disponible: false`, y retirar un
 * grano es `stock: false` — así Brumita puede decir "eso ya no lo tenemos" en
 * vez de comportarse como si nunca hubiera existido, y no se pierde el
 * histórico.
 *
 * Esa política estaba decidida pero no se notaba, que es casi lo mismo que no
 * tenerla: una clave borrada del archivo se quedaba en la base en silencio. Y
 * en el caso de los granos tiene consecuencia directa sobre el RAG — la ficha
 * huérfana sigue ahí, así que `pnpm rag:ingest` la vuelve a indexar y Brumita sigue
 * recomendando un origen que ya no está en el catálogo.
 *
 * Por eso ahora las huérfanas se reportan al final. No se borran solas: borrar
 * datos de producción no es algo que un script deba decidir por su cuenta.
 */

/** Pisa todas las columnas menos la identidad. `excluded` es la fila que se intentó insertar. */
const pisarTodo = (tabla: PgTable) =>
  Object.fromEntries(
    Object.entries(getTableColumns(tabla))
      .filter(([prop]) => prop !== "id" && prop !== "clave")
      .map(([prop, col]) => [prop, sql.raw(`excluded.${col.name}`)]),
  );

/**
 * Las claves que están en la base pero ya no en el archivo.
 *
 * Se pregunta adentro de la misma transacción y después de los upserts: así lo
 * que se compara es el estado final, no una foto vieja.
 */
async function huerfanas(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tabla: typeof productos | typeof granos,
  clavesDelArchivo: string[],
) {
  const enBase = await tx.select({ clave: tabla.clave }).from(tabla);
  return enBase.map((f) => f.clave).filter((clave) => !clavesDelArchivo.includes(clave));
}

async function main() {
  const sobrantes: string[] = [];

  await db.transaction(async (tx) => {
    // Los granos primero: `chunks` los referencia por FK.
    const g = await tx
      .insert(granos)
      .values(GRANOS)
      .onConflictDoUpdate({ target: granos.clave, set: pisarTodo(granos) })
      .returning({ clave: granos.clave });

    const p = await tx
      .insert(productos)
      .values(PRODUCTOS)
      .onConflictDoUpdate({ target: productos.clave, set: pisarTodo(productos) })
      .returning({ clave: productos.clave });

    console.log(`granos: ${g.length} · productos: ${p.length}`);

    for (const clave of await huerfanas(tx, granos, GRANOS.map((x) => x.clave))) {
      sobrantes.push(`grano "${clave}"`);
    }
    for (const clave of await huerfanas(tx, productos, PRODUCTOS.map((x) => x.clave))) {
      sobrantes.push(`producto "${clave}"`);
    }
  });

  if (sobrantes.length > 0) {
    console.warn(
      `\nEstán en la base y ya no en los archivos maestros:\n` +
        sobrantes.map((s) => `  · ${s}`).join("\n") +
        `\n\nNo se borran solas. Si se retiraron, ponelas de vuelta en el archivo con` +
        ` disponible/stock en false; si sobran de verdad, borralas a mano.` +
        `\nOjo con los granos: una ficha huérfana la sigue indexando \`pnpm rag:ingest\`.\n`,
    );
  }
}

main()
  .then(() => conexion.end())
  .catch(async (e) => {
    console.error(e);
    await conexion.end();
    process.exit(1);
  });
