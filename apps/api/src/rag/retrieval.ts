import { sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { embeberConsulta } from "./embeddings.ts";

/**
 * La búsqueda vectorial sobre las fichas de grano.
 *
 * Es la mitad "retrieval" del RAG: la otra mitad —el menú, los precios— se
 * responde con SQL exacto, porque un precio se contesta bien o no se contesta.
 * Acá adentro solo vive lo que es significado: prosa sobre orígenes.
 */

/**
 * Un pedazo de ficha con la identidad y los datos duros de su grano.
 *
 * `precio` y `stock` viajan al lado de la prosa, y eso cierra una alucinación
 * medida: `pnpm rag:evaluar` agarró a Brumita recomendando el Nariño —que
 * `verGranos` había filtrado por estar agotado— y poniéndole un precio de
 * $18.500 que no existe. Los chunks eran solo texto, así que el modelo tenía la
 * descripción de un grano sin nada que dijera cuánto sale ni si está, y lo
 * completó. Ver la migración 0005.
 *
 * No mezcla lo semántico con lo exacto: `contenido` sale del vector, `precio` y
 * `stock` salen del JOIN contra `granos`, que es la misma tabla que lee
 * `verGranos`. Es el mismo dato, no una copia.
 */
export type ChunkRecuperado = {
  contenido: string;
  granoClave: string;
  granoNombre: string;
  /** En pesos, como lo diría una persona. La función lo devuelve en centavos. */
  granoPrecio: number;
  granoStock: boolean;
  similitud: number;
};

/**
 * Sin umbral siempre vuelven cinco chunks, tengan o no que ver, y el modelo
 * responde con seguridad sobre nada. Con umbral, una pregunta lejana al dominio
 * no recupera nada y Brumita puede decir que no sabe.
 *
 * El valor sale de `pnpm rag:calibrar`, que mide en vez de opinar. Contra las
 * preguntas ajenas **lejanas** —bicicletas, el dólar, el clima— el hueco es
 * cómodo: la mejor ajena da 0.590 y la peor legítima 0.627, así que el umbral
 * va al medio.
 *
 * ## Lo que este número NO hace, y está medido
 *
 * La primera calibración daba un hueco de 0.024 y parecía que el umbral
 * separaba el dominio. Era un artefacto de tener negativos fáciles. Al agregar
 * preguntas ajenas **cercanas** —"¿tienen descafeinado?", "¿tienen un grano de
 * Kenia?", "¿venden cápsulas?"— el conjunto se rompe:
 *
 *   peor pregunta legítima : 0.627
 *   mejor ajena cercana    : 0.693   ← más alta que varias legítimas
 *   hueco                  : -0.066
 *
 * **Ningún umbral las separa**, y subirlo para intentarlo rompe preguntas
 * reales antes: el techo es 0.627. Tampoco es un defecto del corpus ni del
 * chunker — es el límite de lo que la similitud coseno puede decidir. "¿Tienen
 * un grano de Kenia?" se parece a "¿cómo es el de Etiopía?", y tiene que
 * parecerse.
 *
 * Lo que las contesta bien es el ruteo de tools. Medido contra el agente, las
 * cinco más difíciles van a `verGranos`, a `buscarProductos` o a ninguna tool:
 * ninguna llega hasta acá. El umbral es la red de abajo para lo que está
 * lejos, no el guardián del dominio.
 */
export const UMBRAL = 0.608;

/** Cinco es lo que entra cómodo en el prompt sin diluir la pregunta. */
export const MAXIMO = 5;

/**
 * La consulta vive en una función de Postgres, `match_chunks`, y no en un query
 * builder acá arriba. Es el patrón `match_documents` del ecosistema pgvector, y
 * se adoptó por una razón medida, no por seguir la costumbre.
 *
 * La versión anterior armaba el orden con Drizzle, `desc(similitud)`, y eso
 * **dejaba el índice HNSW sin usar**. Con EXPLAIN sobre esta base, forzando
 * enable_seqscan = off:
 *
 *   ORDER BY 1 - (embedding <=> $1) DESC  ->  Seq Scan on chunks
 *   ORDER BY embedding <=> $1             ->  Index Scan using chunks_embedding_idx
 *
 * HNSW indexa el operador de distancia, no una expresión derivada de él. Los
 * dos órdenes dan el mismo resultado —invertir el signo no cambia el orden— y
 * con 20 chunks tampoco cambia el tiempo, pero uno escala y el otro no.
 *
 * Lo que se pierde: el orden y el umbral dejan de estar tipados por Drizzle y
 * pasan a vivir en una migración. Es el costo del patrón, y a cambio la lógica
 * de recuperación queda junto a los datos y se puede llamar desde cualquier
 * cliente de la base, no solo desde este servicio.
 */
export async function buscarEnFichas(
  consulta: string,
  { umbral = UMBRAL, maximo = MAXIMO } = {},
): Promise<ChunkRecuperado[]> {
  if (!consulta.trim()) return [];

  const embedding = await embeberConsulta(consulta);

  // El vector viaja como parámetro, no interpolado en el texto de la consulta:
  // son 768 números y `sql` los manda como bind, así que no hay 12 kB de
  // literal por cada pregunta ni forma de romper el statement.
  const filas = await db.execute<{
    contenido: string;
    grano_clave: string;
    grano_nombre: string;
    grano_precio: number;
    grano_stock: boolean;
    similitud: number;
  }>(
    sql`SELECT * FROM match_chunks(${JSON.stringify(embedding)}::vector, ${umbral}, ${maximo})`,
  );

  return Array.from(filas).map((fila) => ({
    contenido: fila.contenido,
    granoClave: fila.grano_clave,
    granoNombre: fila.grano_nombre,
    // A pesos acá y no en la función, por la misma razón que en el servicio de
    // catálogo: la base guarda centavos y la conversación habla en pesos.
    granoPrecio: fila.grano_precio / 100,
    granoStock: fila.grano_stock,
    similitud: fila.similitud,
  }));
}
