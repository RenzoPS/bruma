import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Los tests del front.
 *
 * Sin jsdom y sin libreria de componentes a proposito: lo unico que se prueba
 * aca son las funciones puras de `lib/brumita.tsx`, que leen las partes de tool
 * de un mensaje y deciden que dice el rotulo "Consultó" abajo de cada respuesta.
 * Esa es la parte del front que puede estar mal sin verse mal.
 *
 * El resto es composicion, tipografia y animacion. Un test de que un div tiene
 * cierta clase no prueba que el diseno este bien y se rompe cada vez que se
 * cambia una utilidad; para eso esta mirar la pagina.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // El alias `@/` lo resuelve el bundler de Next, no TypeScript, asi que
    // vitest necesita el suyo.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
