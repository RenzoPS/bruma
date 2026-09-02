import { z } from "zod";

/**
 * Las variables se validan al arrancar, no al usarlas. Si falta la API key,
 * conviene enterarse en el arranque y no cuando un visitante haga la primera
 * pregunta.
 */
const esquema = z.object({
  DATABASE_URL: z.url({ error: "DATABASE_URL debe ser la connection string de Postgres" }),
  GOOGLE_GENERATIVE_AI_API_KEY: z
    .string()
    .min(1, "Falta la API key de Gemini (Google AI Studio)"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Los origenes que pueden llamar a esta API desde un navegador, separados por
   * coma. Es una lista blanca y no un `*` a proposito: el `*` deja que
   * cualquier pagina de internet le haga preguntas a Brumita desde el navegador
   * de un visitante, y la cuota de Gemini la paga este proyecto.
   */
  ORIGENES_WEB: z
    .string()
    .default("http://localhost:3000")
    .transform((valor) =>
      valor
        .split(",")
        .map((origen) => origen.trim())
        .filter(Boolean),
    ),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  const detalle = resultado.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Configuracion invalida:\n${detalle}`);
}

export const env = resultado.data;
