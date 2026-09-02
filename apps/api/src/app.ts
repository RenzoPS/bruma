import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./lib/env.ts";
import { crearChatRouter } from "./routes/chat.ts";
import { healthRouter } from "./routes/health.ts";

/**
 * Construye la app sin escuchar en ningun puerto, para que los tests puedan
 * levantarla con supertest sin ocupar uno.
 */
export function crearApp() {
  const app = express();

  // En produccion la api corre detras de un proxy (Render, Cloud Run), y sin
  // esto req.ip devuelve la IP del proxy para todas las visitas: el limite por
  // IP lo pagaria entero el primero que pregunta. Un solo salto, que es lo que
  // hay; confiar en toda la cadena de X-Forwarded-For deja falsearla.
  if (env.NODE_ENV === "production") app.set("trust proxy", 1);

  // Cabeceras de seguridad. Esto es una API JSON, no un sitio: no sirve nada
  // que un navegador tenga que renderizar, asi que la CSP por defecto de helmet
  // —pensada para HTML— se cambia por una que prohibe todo. Sirve para el caso
  // en que alguien abra una respuesta de error directo en el navegador.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { "default-src": ["'none'"], "frame-ancestors": ["'none'"] } },
      // La api se sirve por HTTPS detras del proxy, que ya manda su propio HSTS.
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  /**
   * CORS con lista blanca.
   *
   * El front la llama por un route handler de Next, asi que en el camino normal el
   * pedido sale del servidor y ni siquiera hay preflight. Esto es para el otro
   * camino: el contenedor publica el 3001 y Render le da una URL propia, asi
   * que la API es alcanzable desde cualquier navegador igual. Sin lista blanca,
   * cualquier pagina puede gastarle la cuota de Gemini a este proyecto.
   *
   * `origin: false` en vez de lanzar un error: un origen no permitido recibe la
   * respuesta sin la cabecera y el navegador la bloquea, que es el
   * comportamiento correcto. Tirar una excepcion convierte un CORS denegado en
   * un 500 en los logs.
   */
  app.use(
    cors({
      origin: (origen, listo) => {
        // Sin Origin son los pedidos que no vienen de un navegador: curl, el
        // healthcheck del contenedor, el proxy de Next. No se bloquean —CORS
        // no es autenticacion y no protege de un cliente que no sea un
        // navegador—, para eso esta el limite por IP.
        if (!origen) return listo(null, true);
        listo(null, env.ORIGENES_WEB.includes(origen));
      },
      methods: ["GET", "POST"],
      maxAge: 86_400,
    }),
  );

  // El cuerpo del chat es texto: el limite corta una carga enorme antes de
  // parsearla, no despues.
  app.use(express.json({ limit: "64kb" }));
  app.use(healthRouter);
  app.use(crearChatRouter());

  app.use((req, res) => {
    res.status(404).json({ error: `No existe la ruta ${req.method} ${req.path}` });
  });

  return app;
}
