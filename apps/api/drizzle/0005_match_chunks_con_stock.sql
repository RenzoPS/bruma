-- Los chunks vuelven con el stock y el precio de su grano.
--
-- Esto no es una comodidad: cierra una alucinación medida. El caso, tal cual
-- salió de `pnpm rag:evaluar`:
--
--   pregunta  : "¿qué grano tenés que sea frutado y que me lo pueda llevar hoy?"
--   verGranos : soloConStock=true -> Cerrado, Huila, Guji. Sin el Nariño, que
--               está agotado. Correcto.
--   fichas    : los chunks más parecidos a "frutado" son los del Nariño, porque
--               el retrieval no sabía nada de stock.
--   respuesta : "Tengo el Nariño (...) y lo podés llevar hoy. Está a $18.500."
--
-- Dos errores encadenados y los dos salen del mismo hueco. Recomendó lo que la
-- capa exacta había filtrado a propósito, y le puso un precio que no existe
-- —los reales son 14500, 15500, 16800 y 18000— porque ninguna tool se lo había
-- dado y la prosa sola no alcanza para contestar la pregunta entera.
--
-- El arreglo es que la prosa y los datos duros de ese grano lleguen juntos. No
-- rompe la separación entre lo semántico y lo exacto, la respeta: `contenido`
-- sigue saliendo de un vector y `precio` y `stock` salen de un JOIN contra
-- `granos`, que es la misma tabla que lee `verGranos`. Lo que se elimina es el
-- hueco donde el modelo tenía que inventar.
--
-- Va con DROP y no con CREATE OR REPLACE: Postgres no deja cambiar el tipo de
-- retorno de una función con REPLACE, y acá la tabla que devuelve tiene dos
-- columnas nuevas.

DROP FUNCTION IF EXISTS match_chunks(vector, double precision, integer);--> statement-breakpoint

CREATE FUNCTION match_chunks(
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  contenido text,
  grano_clave text,
  grano_nombre text,
  grano_precio integer,
  grano_stock boolean,
  similitud double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.contenido,
    g.clave AS grano_clave,
    g.nombre AS grano_nombre,
    -- En centavos, igual que la columna. Pasarlo a pesos es trabajo del
    -- servicio, y hacerlo acá dejaría dos lugares donde se divide por cien.
    g.precio AS grano_precio,
    g.stock AS grano_stock,
    -- El operador <=> devuelve distancia coseno. La similitud es su
    -- complemento, y es lo que se muestra en el front y lo que compara el
    -- script de calibración.
    1 - (c.embedding <=> query_embedding) AS similitud
  FROM chunks c
  INNER JOIN granos g ON g.id = c.grano_id
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  -- Por distancia ascendente, que es lo único que el índice HNSW puede
  -- resolver. Ordenar por similitud descendente da el mismo resultado y no usa
  -- el índice: ver la nota de la migración 0002.
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
