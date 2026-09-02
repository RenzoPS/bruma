import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearApp } from "../src/app.ts";

/**
 * Las cabeceras que pone la app antes de que ninguna ruta se entere.
 *
 * Son dos piezas de terceros —helmet y cors— y por eso mismo se prueban: lo que
 * se está verificando no es que la librería funcione, sino que **está
 * configurada como creemos**. Una lista blanca de orígenes mal armada no falla
 * en desarrollo, falla en producción y en silencio.
 */

describe("helmet", () => {
  it("prohíbe adivinar el tipo de contenido", async () => {
    const res = await request(crearApp()).get("/healthz");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("manda una CSP que no permite cargar nada", async () => {
    // Esto es una API JSON: no sirve nada que un navegador tenga que
    // renderizar, así que la CSP por defecto de helmet —pensada para HTML— se
    // reemplaza por una que prohíbe todo.
    const res = await request(crearApp()).get("/healthz");

    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  it("no anuncia que corre sobre Express", async () => {
    const res = await request(crearApp()).get("/healthz");

    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("cors", () => {
  it("le responde al origen del sitio", async () => {
    const res = await request(crearApp())
      .get("/healthz")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("no le da la cabecera a un origen que no está en la lista", async () => {
    const res = await request(crearApp())
      .get("/healthz")
      .set("Origin", "https://sitio-de-otro.com");

    // El pedido se responde igual —CORS lo aplica el navegador, no el
    // servidor— pero sin la cabecera, así que el navegador lo bloquea. Lo que
    // importa es que la cabecera NO esté: con ella, cualquier página de
    // internet le gasta la cuota de Gemini a este proyecto.
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("deja pasar lo que no viene de un navegador", async () => {
    // Sin Origin: curl, el healthcheck del contenedor, el rewrite de Next. CORS
    // no es autenticación y no protege de un cliente que no sea un navegador;
    // para eso está el límite por IP.
    const res = await request(crearApp()).get("/healthz");

    expect(res.status).toBe(200);
  });

  it("responde el preflight del chat", async () => {
    const res = await request(crearApp())
      .options("/chat")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBeLessThan(300);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });
});
