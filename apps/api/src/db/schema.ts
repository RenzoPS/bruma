import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  vector,
  unique,
} from "drizzle-orm/pg-core";
import { DIMENSIONES_EMBEDDING } from "../dominio.ts";

/**
 * La carta del local. Cambia seguido y se consulta por valor exacto, asi que
 * NO se vectoriza: un precio embebido en un vector es un precio que se responde
 * mal. Estas filas se leen con tools de argumentos tipados, nunca con SQL
 * generado por el modelo.
 */
export const productos = pgTable("productos", {
  id: serial("id").primaryKey(),
  /**
   * La identidad del producto para el negocio, no para la base. El `id` es un
   * autoincremental y no sirve para reconocer una fila entre dos corridas de
   * la carga: cambia si se inserta en otro orden. `clave` no cambia nunca, y
   * es la misma que usa el front en carta.ts y en el diccionario.
   *
   * Es tambien el ON CONFLICT de src/db/maestros/aplicar.ts: sin esta columna,
   * aplicar la carta dos veces duplicaria las filas en vez de actualizarlas.
   */
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  /** Uno de `CATEGORIAS` en src/dominio.ts, que es la fuente del vocabulario. */
  categoria: text("categoria").notNull(),
  /** En centavos. Nunca float: 0.1 + 0.2 no es 0.3 y un precio no se redondea solo. */
  precio: integer("precio").notNull(),
  descripcion: text("descripcion"),
  disponible: boolean("disponible").notNull().default(true),
});

/**
 * El grano en bolsa. `ficha` es prosa larga sobre un origen ficticio: eso es lo
 * unico que el modelo no puede saber de antemano, y por eso es lo unico que se
 * indexa. El resto de las columnas son filtros exactos.
 */
export const granos = pgTable("granos", {
  id: serial("id").primaryKey(),
  /** Misma razon que en `productos`: la identidad estable, para el upsert. */
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  origen: text("origen").notNull(),
  /** Uno de `PROCESOS`. */
  proceso: text("proceso").notNull(),
  altura: integer("altura"),
  /** Uno de `PERFILES`. */
  perfil: text("perfil").notNull(),
  precio: integer("precio").notNull(),
  ficha: text("ficha").notNull(),
  stock: boolean("stock").notNull().default(true),
});

/**
 * Un pedazo de ficha con su embedding. La cantidad de dimensiones sale de
 * `DIMENSIONES_EMBEDDING` en src/dominio.ts, que es tambien lo que se le pide a
 * Gemini via outputDimensionality: el numero vive una sola vez.
 *
 * El indice HNSW no cambia nada con ~70 chunks (a esa escala el scan secuencial
 * gana). Esta para que el sistema sea correcto a escala, y para poder medir la
 * diferencia con y sin indice en vez de suponerla.
 */
export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    granoId: integer("grano_id")
      .notNull()
      .references(() => granos.id, { onDelete: "cascade" }),
    /**
     * En qué orden salió de la ficha. Sin esto el chunk pierde de dónde venía:
     * los cinco que devuelve el retrieval llegan sueltos y no hay forma de
     * saber cuál seguía a cuál.
     *
     * Sirve para dos cosas concretas. Hoy: la reconstrucción es determinística
     * —reindexar dos veces la misma ficha da las mismas filas en el mismo
     * orden— y el UNIQUE de abajo lo garantiza. Mañana: recuperar los vecinos
     * de un chunk que quedó a mitad de una explicación, que es la mejora que
     * pide un corpus más largo que estas cuatro fichas.
     */
    posicion: integer("posicion").notNull(),
    contenido: text("contenido").notNull(),
    embedding: vector("embedding", { dimensions: DIMENSIONES_EMBEDDING }).notNull(),
    /**
     * Con qué modelo se generó este vector.
     *
     * Un embedding solo es comparable con otro del mismo modelo. Si alguien
     * cambia `MODELO` y se olvida de reindexar, la búsqueda no falla: devuelve
     * resultados peores, en silencio, que es la peor forma de romperse. Con la
     * columna, la pregunta "¿este índice está al día?" es un SELECT.
     */
    modeloEmbedding: text("modelo_embedding").notNull(),
    /**
     * De qué texto salió este chunk, y con qué parámetros de corte.
     *
     * Es el par del anterior y cubre el otro fallo silencioso, que además es el
     * más probable: alguien corrige una ficha, corre `db:maestros` y se olvida
     * de `rag:ingest`. El índice queda sirviendo el texto viejo y nadie se
     * entera — la búsqueda no falla, contesta con información desactualizada.
     *
     * Guarda una huella, no el texto: comparar 16 caracteres contra recalcular
     * la ficha es la diferencia entre un chequeo al arranque y una consulta que
     * mueve prosa. Ver `huellaDeFicha`.
     */
    fichaHash: text("ficha_hash").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    // Dos chunks de la misma ficha no pueden ocupar el mismo lugar. Es la
    // integridad que hace que `posicion` signifique algo.
    unique("chunks_grano_posicion_uq").on(table.granoId, table.posicion),
  ],
);

export type Producto = typeof productos.$inferSelect;
export type Grano = typeof granos.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
