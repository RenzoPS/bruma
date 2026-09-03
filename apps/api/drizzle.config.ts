import { existsSync } from "node:fs";
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
 *
 * **Adentro de Docker ese archivo no existe, y no tiene que existir.** La imagen
 * copia `src/` y `drizzle/`, no el `.env` de la raiz —meter credenciales en una
 * imagen es exactamente lo que no hay que hacer— y compose le pasa
 * `DATABASE_URL` por `environment:`. Cargar el archivo a ciegas tiraba ENOENT y
 * el servicio `migrate` moria antes de mirar el entorno, que ya estaba bien:
 *
 *     migrate-1 | ENOENT: no such file or directory, open '../../.env'
 *
 * Y como la api espera a `migrate` con `service_completed_successfully`, eso
 * dejaba el stack entero sin levantar. O sea: el `docker compose up --build` del
 * README no funcionaba desde cero.
 *
 * Por eso el archivo es opcional y el entorno manda. Lo que NO es opcional es
 * `DATABASE_URL`: si no esta por ningun lado, se falla acá y con un mensaje que
 * dice qué falta, en vez de dejar que drizzle-kit intente conectarse a
 * `undefined`.
 */
if (existsSync("../../.env")) process.loadEnvFile("../../.env");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL. Fuera de Docker sale del .env de la raiz; adentro, del environment de compose.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
});
