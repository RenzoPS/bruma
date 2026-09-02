import { defineConfig } from "vitest/config";

/**
 * Dos suites, y la diferencia es qué necesitan para correr.
 *
 * `pnpm test` no toca nada externo: chunking, datos maestros, rutas. Corre en
 * medio segundo, sin Docker y sin API key, así que puede ir en cada guardado y
 * en CI sin secretos.
 *
 * `pnpm test:int` necesita Postgres levantado, los chunks indexados y cuota de
 * Gemini. Son los que defienden el retrieval, y no pueden ser rápidos: cada
 * caso es una llamada a la API. Mezclarlos haría que `pnpm test` fallara en
 * cualquier máquina sin el stack arriba, y un test que falla por el entorno
 * deja de mirarse.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integracion/**"],
    /**
     * Valores de mentira, y alcanzan.
     *
     * Desde que la app monta el router del chat, importarla arrastra las tools,
     * el catalogo y el cliente de la base, y `src/lib/env.ts` valida el entorno
     * entero en el import. Eso es correcto —es la validacion al arranque que
     * queremos en produccion— pero dejaria esta suite dependiendo de un `.env`.
     *
     * No hay conexion ni llamada de red detras de esto: postgres.js no abre el
     * socket hasta la primera consulta, y estos tests no consultan. Lo que se
     * prueba aca es lo que pasa ANTES de tocar la base o el modelo: el esquema
     * del cuerpo, el limite por IP, el 404.
     */
    env: {
      DATABASE_URL: "postgresql://tests:tests@localhost:5432/tests",
      GOOGLE_GENERATIVE_AI_API_KEY: "clave-de-test",
    },
  },
});
