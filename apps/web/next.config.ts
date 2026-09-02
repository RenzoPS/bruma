import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta el server con solo las dependencias que el build realmente usa,
  // en vez de arrastrar node_modules entero al contenedor. Es la diferencia
  // entre una imagen de cientos de megas y una de decenas.
  output: "standalone",
};

export default nextConfig;

/**
 * Acá vivía un `rewrite` de /api/brumita/* hacia la API, y se sacó porque
 * **fallaba solo en produccion**.
 *
 * Con `output: "standalone"` los rewrites se resuelven al construir la imagen y
 * el destino queda escrito en `required-server-files.json`. En build time
 * `BRUMITA_API_URL` no esta definida, asi que se horneaba el fallback a
 * localhost y el contenedor `web` le pedia a su propio localhost:
 * `connect ECONNREFUSED 127.0.0.1:3001` en el log.
 *
 * El proxy es ahora `src/app/api/brumita/chat/route.ts`, que lee el entorno en
 * cada request y deja la imagen agnostica de contra que API corre.
 */
