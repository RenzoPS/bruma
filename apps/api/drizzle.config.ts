import { defineConfig } from "drizzle-kit";

/**
 * La configuracion vive en el `.env` de la raiz, que es el unico del repo.
 *
 * Hace falta cargarlo a mano porque drizzle-kit busca un `.env` en su cwd
 * —`apps/api`— y ahi no hay ninguno. El resto de los comandos resuelven lo
 * mismo con el `--env-file=../../.env` de sus scripts, pero drizzle-kit no
 * pasa por Node directamente y no puede recibir ese flag.
 *
 * La ruta es relativa al cwd, no a este archivo: los scripts de package.json
 * corren siempre parados en `apps/api`.
 */
process.loadEnvFile("../../.env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
