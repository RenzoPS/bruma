/**
 * El chat, proxeado por el servidor de Next.
 *
 * Esto era un `rewrite` en next.config.ts y **fallaba solo en producción**. Con
 * `output: "standalone"` los rewrites se resuelven al construir la imagen y el
 * destino queda escrito en `required-server-files.json`: en build time
 * `BRUMITA_API_URL` no existe, así que se horneaba el fallback y el contenedor
 * `web` terminaba pidiéndole a su propio localhost. En el log del contenedor se
 * veía tal cual: `connect ECONNREFUSED 127.0.0.1:3001`.
 *
 * Un route handler lee el entorno **en cada request**, así que la imagen no sabe
 * contra qué API corre y la misma sirve para el compose local y para el deploy.
 *
 * Lo que se gana además de arreglarlo: el pedido sale del servidor de Next, así
 * que para el navegador el chat es una ruta más del sitio —mismo origen, sin
 * preflight— y la URL de la API nunca llega al HTML.
 */

/** Sin cachear nada: es un stream y cada pregunta es distinta. */
export const dynamic = "force-dynamic";

const api = () => process.env.BRUMITA_API_URL ?? "http://localhost:3001";

/**
 * Las cabeceras que tienen que sobrevivir el viaje de vuelta.
 *
 * Se copian estas y no todas: `content-length` y `content-encoding` describen el
 * cuerpo que ya se consumió acá y reenviarlas rompe el stream del lado del
 * navegador.
 */
const CABECERAS = ["content-type", "cache-control", "x-vercel-ai-ui-message-stream"];

export async function POST(pedido: Request) {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${api()}/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // La IP del visitante viaja hasta la API, que corre con `trust proxy`.
        // Sin esto el límite por IP ve siempre la del contenedor de Next y las
        // treinta preguntas de una persona se las come todo el mundo.
        ...reenviarIp(pedido),
      },
      body: await pedido.text(),
    });
  } catch (error) {
    console.error("No se pudo llegar a la API de Brumita:", error);
    return Response.json({ error: "Brumita no está disponible ahora mismo." }, { status: 502 });
  }

  const cabeceras = new Headers();
  for (const nombre of CABECERAS) {
    const valor = respuesta.headers.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }

  return new Response(respuesta.body, { status: respuesta.status, headers: cabeceras });
}

function reenviarIp(pedido: Request): Record<string, string> {
  const cadena = pedido.headers.get("x-forwarded-for");
  return cadena ? { "x-forwarded-for": cadena } : {};
}
