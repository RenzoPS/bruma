import { afterAll, describe, expect, it } from "vitest";
import { conexion } from "../../src/db/client.ts";
import {
  buscarProductos,
  horariosYUbicacion,
  verGranos,
} from "../../src/services/catalogo.service.ts";

/**
 * El catálogo contra la base. No llama a Gemini: son consultas SQL.
 *
 * Requiere el stack arriba con los datos maestros aplicados:
 *   docker compose up -d postgres && pnpm db:setup
 */

afterAll(async () => {
  await conexion.end();
});

describe("buscarProductos", () => {
  it("por defecto trae solo lo disponible", async () => {
    const r = await buscarProductos();

    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.disponible)).toBe(true);
    // El Nariño está agotado, así que no debería aparecer.
    expect(r.map((p) => p.nombre)).not.toContain("Nariño, Colombia");
  });

  it("puede traer lo agotado si se lo piden", async () => {
    const r = await buscarProductos({ soloDisponibles: false });

    expect(r.map((p) => p.nombre)).toContain("Nariño, Colombia");
  });

  it("devuelve los precios en pesos, no en centavos", async () => {
    const [espresso] = await buscarProductos({ categoria: "cafe", precioMaximo: 3500 });

    // 320000 centavos en la base, $3.200 en la conversación.
    expect(espresso?.nombre).toBe("Espresso");
    expect(espresso?.precio).toBe(3200);
  });

  it("filtra por categoría", async () => {
    const r = await buscarProductos({ categoria: "desayuno" });

    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.categoria === "desayuno")).toBe(true);
  });

  it("el tope de precio se interpreta en pesos", async () => {
    const r = await buscarProductos({ precioMaximo: 3000 });

    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.precio <= 3000)).toBe(true);
    // Si lo tomara como centavos, no volvería nada.
    expect(r.map((p) => p.nombre)).toContain("Medialuna");
  });

  it("ordena de más barato a más caro", async () => {
    const precios = (await buscarProductos()).map((p) => p.precio);

    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });

  it("no rompe cuando el filtro no encuentra nada", async () => {
    expect(await buscarProductos({ precioMaximo: 1 })).toEqual([]);
  });
});

describe("verGranos", () => {
  it("trae los cuatro orígenes", async () => {
    expect(await verGranos()).toHaveLength(4);
  });

  it("filtra por proceso", async () => {
    const r = await verGranos({ proceso: "honey" });

    expect(r).toHaveLength(1);
    expect(r[0]?.nombre).toBe("Nariño, Colombia");
  });

  it("filtra por perfil", async () => {
    const r = await verGranos({ perfil: "claro" });

    expect(r.map((g) => g.nombre)).toEqual(["Guji, Etiopía"]);
  });

  it("puede excluir lo que no tiene stock", async () => {
    const r = await verGranos({ soloConStock: true });

    expect(r).toHaveLength(3);
    expect(r.every((g) => g.stock)).toBe(true);
  });

  it("no expone la ficha: esa se llega por retrieval", async () => {
    const [grano] = await verGranos();

    expect(grano).not.toHaveProperty("ficha");
  });

  it("informa la altura, que es un filtro exacto y no prosa", async () => {
    const [guji] = await verGranos({ perfil: "claro" });

    expect(guji?.altura).toBe(2050);
  });
});

describe("horariosYUbicacion", () => {
  it("responde sin tocar la base", () => {
    const info = horariosYUbicacion();

    expect(info.direccion).toContain("Cabrera 4680");
    expect(info.horario).toContain("7:30");
    expect(info.wifi).toBe(true);
  });
});
