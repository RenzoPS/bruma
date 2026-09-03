import { conexion } from "../db/client.ts";
import { reconstruirIndice } from "../rag/indexar.ts";

/**
 * Convierte las fichas de grano en vectores buscables.
 *
 * Corre a mano (`pnpm rag:ingest`), nunca en un request ni al arrancar el stack:
 * llama a la API de Gemini, así que gasta cuota, tarda y necesita red. Los
 * vectores de una ficha que no cambió son idénticos a los de ayer, y pagarlos
 * de nuevo en cada `docker compose up` no compra nada.
 *
 * El algoritmo vive en `src/rag/indexar.ts`. Acá solo queda lo que es propio de
 * un comando: correrlo, avisar cómo salió y cerrar la conexión — postgres.js
 * deja el pool abierto y sin esto el proceso no termina nunca.
 */

reconstruirIndice()
  .then(() => conexion.end())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await conexion.end();
    process.exit(1);
  });
