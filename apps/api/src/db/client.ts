import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env.ts";
import * as schema from "./schema.ts";

/**
 * La conexion cruda. Se exporta aparte del `db` porque los scripts que corren
 * y terminan (los datos maestros, la ingesta) tienen que cerrarla a mano:
 * postgres.js deja el pool abierto y el proceso no saldria nunca.
 *
 * El server no la cierra nunca — vive mientras viva el proceso.
 */
export const conexion = postgres(env.DATABASE_URL);

export const db = drizzle(conexion, { schema });
