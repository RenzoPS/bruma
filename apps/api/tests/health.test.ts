import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearApp } from "../src/app.ts";

describe("GET /healthz", () => {
  it("responde 200 con estado ok", async () => {
    const res = await request(crearApp()).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: "ok" });
  });

  it("informa cuanto hace que arranco el proceso", async () => {
    const res = await request(crearApp()).get("/healthz");

    expect(res.body.uptime).toBeTypeOf("number");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("rutas desconocidas", () => {
  it("devuelve 404 con un cuerpo que nombra el problema", async () => {
    const res = await request(crearApp()).get("/no-existe");

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("/no-existe");
  });
});
