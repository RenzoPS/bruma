/**
 * El vocabulario cerrado del negocio, en un solo lugar.
 *
 * Antes cada valor vivía tres veces: el enum de Zod en las tools, el union de
 * TypeScript en el servicio de catálogo, y un comentario al lado de la columna
 * en el esquema. Y ya habían derivado — el comentario de `categoria` decía
 * `cafe | desayuno | pasteleria | promo` cuando los valores reales son
 * `cafe | acompanar | desayuno | grano`. Nadie lo nota, porque un comentario no
 * falla.
 *
 * Con una sola fuente, agregar una categoría es cambiar un arreglo: el enum de
 * Zod, el tipo y la validación de los datos maestros salen de acá.
 *
 * Son `as const` para que TypeScript derive el union de literales y no `string`.
 */

/** Qué se vende en el mostrador. */
export const CATEGORIAS = ["cafe", "acompanar", "desayuno", "grano"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/** Cómo se benefició el grano después de cosechado. */
export const PROCESOS = ["lavado", "natural", "honey"] as const;
export type Proceso = (typeof PROCESOS)[number];

/** El punto de tueste. */
export const PERFILES = ["claro", "medio", "oscuro"] as const;
export type Perfil = (typeof PERFILES)[number];

/**
 * Cuánto pesa una bolsa de grano.
 *
 * Vivía en dos comentarios y en el front, y en ninguna tool. `pnpm rag:evaluar`
 * agarró a Brumita diciendo "la bolsa de 250 g sale $15.500" con el precio bien
 * y los gramos sacados de la nada: el número es correcto —250 g es la bolsa
 * típica de especialidad— pero ninguna herramienta se lo había dado.
 *
 * Que un dato inventado salga bien por casualidad es peor que uno que sale mal,
 * porque no deja síntoma. La respuesta no era mentir sobre esto, era dárselo:
 * el modelo lo iba a decir igual, así que ahora lo dice porque lo leyó.
 */
export const GRAMOS_POR_BOLSA = 250;

/**
 * Las dimensiones del vector, y por qué viven acá y no en el módulo de
 * embeddings.
 *
 * Las necesitan dos lados que no deberían conocerse: `db/schema.ts`, para
 * declarar `vector(N)`, y `rag/embeddings.ts`, para pedírselas a Gemini. Si el
 * esquema importara del módulo de embeddings, la definición de la tabla
 * arrastraría al SDK de IA entero; poniéndolas en un archivo sin dependencias,
 * los dos leen del mismo número.
 *
 * El número estaba escrito dos veces —literal en el esquema, constante en
 * embeddings— y cambiar uno sin el otro da un error recién al comparar
 * vectores, lejos de la causa.
 */
export const DIMENSIONES_EMBEDDING = 768;
