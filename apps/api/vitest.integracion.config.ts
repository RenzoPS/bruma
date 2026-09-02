import { defineConfig } from "vitest/config";

/**
 * Los tests que necesitan Postgres arriba, los chunks indexados y cuota de
 * Gemini. Ver el comentario de vitest.config.ts.
 *
 * El timeout es largo a propósito: cada caso hace una llamada de red a la API
 * de embeddings, y el de acierto hace dieciocho.
 */
export default defineConfig({
  test: {
    include: ["tests/integracion/**/*.test.ts"],
    // El resto de los scripts usa el --env-file de Node, pero acá el proceso lo
    // arranca vitest y ese flag no llega. Este setup carga el .env de la raíz.
    setupFiles: ["./tests/env.ts"],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    // En serie: las suites comparten la misma base y la misma cuota.
    fileParallelism: false,
    /**
     * Un reintento por caso, y es contra Google, no contra nosotros.
     *
     * El free tier devuelve 503 "high demand" de a ratos: en dos corridas
     * seguidas de esta misma suite fallaron casos distintos, siempre con ese
     * error y después de los tres intentos que ya hace el SDK. Reintentar acá
     * es lo proporcionado — la alternativa era subirle los reintentos a la app,
     * que le haría esperar treinta segundos a un visitante para tapar un
     * problema que no es suyo.
     *
     * Ojo con lo que esto puede esconder: si un caso empieza a necesitar el
     * reintento siempre, eso ya no es un pico de Google y hay que mirarlo.
     */
    retry: 1,
  },
});
