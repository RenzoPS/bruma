-- La huella de la ficha con la que se generó cada chunk.
--
-- Mismo caso que la migración anterior: NOT NULL sin default sobre una tabla
-- con filas, y no hay valor que inventar — nadie sabe de qué texto salió un
-- chunk que no lo guardó. Se vacía y se reconstruye, que es lo que `chunks`
-- permite por ser dato derivado de `granos.ficha`.
--
-- Después de aplicarla:
--
--     pnpm rag:ingest
DELETE FROM "chunks";--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "ficha_hash" text NOT NULL;
