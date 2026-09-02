import { describe, expect, it } from "vitest";
import { ESQUEMAS, herramientas } from "../src/agente/herramientas.ts";

/**
 * La whitelist, mirada como whitelist.
 *
 * Estos tests no llaman a las tools: validan sus esquemas. Es exactamente lo
 * que ocurre en producción antes de que un argumento del modelo llegue a la
 * base, y es la razón por la que no hace falta filtrar SQL — no hay SQL que
 * filtrar, solo un enum que acepta cuatro valores.
 *
 * Ninguno toca Postgres ni Gemini.
 */

const esquema = (nombre: keyof typeof ESQUEMAS) => ESQUEMAS[nombre];

describe("la superficie declarada", () => {
  it("expone cuatro herramientas y ninguna más", () => {
    expect(Object.keys(herramientas).sort()).toEqual([
      "buscarEnFichas",
      "buscarProductos",
      "horariosYUbicacion",
      "verGranos",
    ]);
  });

  it("todas describen cuándo usarse", () => {
    // La descripción es lo que rutea la pregunta. Una tool sin descripción es
    // una tool que el modelo va a elegir a ciegas.
    for (const [nombre, herramienta] of Object.entries(herramientas)) {
      expect(herramienta.description, nombre).toBeTruthy();
      expect(herramienta.description!.length, nombre).toBeGreaterThan(40);
    }
  });
});

describe("buscarProductos", () => {
  it("acepta no recibir ningún filtro", () => {
    expect(esquema("buscarProductos").safeParse({}).success).toBe(true);
  });

  it("acepta las categorías que existen en la carta", () => {
    for (const categoria of ["cafe", "acompanar", "desayuno", "grano"]) {
      expect(esquema("buscarProductos").safeParse({ categoria }).success, categoria).toBe(true);
    }
  });

  it("rechaza una categoría inventada", () => {
    expect(esquema("buscarProductos").safeParse({ categoria: "vinos" }).success).toBe(false);
  });

  it("rechaza SQL en el lugar de un filtro", () => {
    // El caso que la gente imagina cuando piensa en un chatbot con base de
    // datos. No hay una lista negra que lo detecte: sencillamente no es uno de
    // los cuatro valores del enum.
    const intento = esquema("buscarProductos").safeParse({
      categoria: "cafe'; DROP TABLE productos; --",
    });

    expect(intento.success).toBe(false);
  });

  it("rechaza un precio negativo", () => {
    expect(esquema("buscarProductos").safeParse({ precioMaximo: -100 }).success).toBe(false);
  });
});

describe("verGranos", () => {
  it("acepta los procesos y perfiles reales", () => {
    expect(esquema("verGranos").safeParse({ proceso: "honey", perfil: "claro" }).success).toBe(true);
  });

  it("rechaza un proceso que BRUMA no usa", () => {
    expect(esquema("verGranos").safeParse({ proceso: "descafeinado" }).success).toBe(false);
  });
});

describe("buscarEnFichas", () => {
  it("pide una consulta", () => {
    expect(esquema("buscarEnFichas").safeParse({}).success).toBe(false);
  });

  it("rechaza una consulta vacía o de una letra", () => {
    expect(esquema("buscarEnFichas").safeParse({ consulta: "" }).success).toBe(false);
    expect(esquema("buscarEnFichas").safeParse({ consulta: "a" }).success).toBe(false);
  });

  it("acota el largo: el embedding de un texto enorme no representa nada", () => {
    expect(esquema("buscarEnFichas").safeParse({ consulta: "a".repeat(401) }).success).toBe(false);
  });
});

describe("horariosYUbicacion", () => {
  it("no lleva argumentos", () => {
    expect(esquema("horariosYUbicacion").safeParse({}).success).toBe(true);
  });
});
