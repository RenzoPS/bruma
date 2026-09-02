import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { limitarPorIp } from "../src/lib/limite.ts";

/**
 * El límite aparte de la ruta: acá se puede mirar el comportamiento de la
 * ventana con números chicos, sin las treinta preguntas del caso real.
 */

const appCon = (maximo: number, ventanaMs: number) => {
  const app = express();
  app.use(limitarPorIp({ maximo, ventanaMs }));
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
};

describe("limitarPorIp", () => {
  it("deja pasar exactamente el máximo y corta el siguiente", async () => {
    const app = appCon(3, 60_000);

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get("/")).status).toBe(200);
    }

    expect((await request(app).get("/")).status).toBe(429);
  });

  it("vuelve a permitir cuando la ventana vence", async () => {
    vi.useFakeTimers();
    try {
      const app = appCon(1, 10_000);

      expect((await request(app).get("/")).status).toBe(200);
      expect((await request(app).get("/")).status).toBe(429);

      vi.advanceTimersByTime(10_001);

      expect((await request(app).get("/")).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cuenta por IP y no en total", async () => {
    const app = appCon(1, 60_000);

    // supertest habla por loopback, así que la IP es siempre la misma y no se
    // puede separar de verdad sin trust proxy. Se prende acá para poder
    // falsear el origen con X-Forwarded-For, que es lo mismo que hace un proxy
    // real en produccion.
    app.set("trust proxy", 1);

    const primera = await request(app).get("/").set("X-Forwarded-For", "203.0.113.1");
    const segunda = await request(app).get("/").set("X-Forwarded-For", "203.0.113.2");
    const repetida = await request(app).get("/").set("X-Forwarded-For", "203.0.113.1");

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(repetida.status).toBe(429);
  });

  it("informa en el Retry-After cuánto falta, no la ventana entera", async () => {
    vi.useFakeTimers();
    try {
      const app = appCon(1, 60_000);
      await request(app).get("/");

      vi.advanceTimersByTime(50_000);
      const res = await request(app).get("/");

      expect(res.status).toBe(429);
      expect(Number(res.headers["retry-after"])).toBe(10);
    } finally {
      vi.useRealTimers();
    }
  });
});
