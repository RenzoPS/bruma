-- La búsqueda semántica, adentro de Postgres.
--
-- Es el patrón `match_documents` del ecosistema pgvector: una función que
-- recibe el vector de la pregunta, el umbral y el tope, y devuelve los chunks
-- con su similitud. Acá no se adopta por costumbre — se adopta porque el orden
-- que usaba Drizzle **dejaba el índice HNSW sin usar**.
--
-- Medido con EXPLAIN sobre esta misma base, forzando enable_seqscan = off:
--
--   ORDER BY 1 - (embedding <=> $1) DESC   ->  Seq Scan on chunks
--   ORDER BY embedding <=> $1              ->  Index Scan using chunks_embedding_idx
--
-- La razón es que HNSW indexa el operador de distancia, no una expresión
-- derivada de él: ordenar por `1 - distancia` descendente es, para el planner,
-- ordenar por una función cualquiera, y no hay índice que sirva. El resultado
-- es idéntico —invertir el signo no cambia el orden— pero uno escala y el otro
-- no. Con 20 chunks da lo mismo; con veinte mil, no.
--
-- El umbral sigue siendo un parámetro y no una constante acá adentro: sale de
-- `pnpm rag:calibrar` y pertenece al corpus, no a la base. Que viaje como argumento
-- deja recalibrarlo sin escribir una migración.

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  contenido text,
  grano_clave text,
  grano_nombre text,
  similitud double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.contenido,
    g.clave AS grano_clave,
    g.nombre AS grano_nombre,
    -- El operador <=> devuelve distancia coseno. La similitud es su
    -- complemento, y es lo que se muestra en el front y lo que compara el
    -- script de calibración.
    1 - (c.embedding <=> query_embedding) AS similitud
  FROM chunks c
  INNER JOIN granos g ON g.id = c.grano_id
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  -- Por distancia ascendente, que es lo único que el índice HNSW puede
  -- resolver. Ordenar por similitud descendente da el mismo resultado y no usa
  -- el índice: ver la nota de arriba.
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
