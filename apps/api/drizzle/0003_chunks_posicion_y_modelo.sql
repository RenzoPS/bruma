-- Dos columnas nuevas en `chunks`, y las dos son NOT NULL sin default.
--
-- Sobre una tabla con filas eso no entra: no hay valor razonable que inventar.
-- `posicion` no se puede deducir de una fila existente —el orden se perdió al
-- no guardarlo— y poner 0 en todas violaría el UNIQUE que agrega esta misma
-- migración. `modelo_embedding` sería una mentira: nadie sabe con qué modelo se
-- generó un vector que no lo dice.
--
-- Así que se vacían primero, y **eso es seguro por diseño**: `chunks` es dato
-- derivado. La fuente de verdad es `granos.ficha`; los chunks y sus vectores
-- son una proyección que se reconstruye entera con un comando. Es la misma
-- propiedad por la que `pnpm rag:ingest` borra y reescribe en vez de actualizar.
--
-- Después de aplicar esta migración hay que correr:
--
--     pnpm rag:ingest
--
-- Hasta que se corra, Brumita no recupera nada de las fichas y lo dice, que es
-- el modo degradado correcto: contesta "no lo tengo" en vez de inventar.
DELETE FROM "chunks";--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "posicion" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "modelo_embedding" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_grano_posicion_uq" UNIQUE("grano_id","posicion");
