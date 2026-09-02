import { describe, expect, it } from "vitest";
import { GRANOS } from "../src/db/maestros/granos.ts";
import { POR_DEFECTO, partirEnChunks } from "../src/rag/chunking.ts";

const parrafo = (largo: number, palabra = "cafe") =>
  Array.from({ length: Math.ceil(largo / (palabra.length + 1)) }, () => palabra)
    .join(" ")
    .slice(0, largo - 1)
    .concat(".");

describe("partirEnChunks", () => {
  it("respeta los párrafos cuando ya entran en el máximo", () => {
    const texto = ["a".repeat(200), "b".repeat(200), "c".repeat(200)].join("\n\n");

    expect(partirEnChunks(texto)).toEqual(["a".repeat(200), "b".repeat(200), "c".repeat(200)]);
  });

  it("no devuelve chunks por encima del máximo", () => {
    const texto = GRANOS.map((g) => g.ficha).join("\n\n");

    for (const chunk of partirEnChunks(texto)) {
      expect(chunk.length).toBeLessThanOrEqual(POR_DEFECTO.tope);
    }
  });

  it("parte un párrafo largo sin cortar oraciones al medio", () => {
    const oracion = `${parrafo(150, "grano")} `;
    const chunks = partirEnChunks(oracion.repeat(8), { objetivo: 400, tope: 600, minimo: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    // Si cortara al medio, algún chunk no terminaría en punto.
    for (const chunk of chunks) expect(chunk.trimEnd().endsWith(".")).toBe(true);
  });

  it("solapa una oración al partir un párrafo largo", () => {
    const texto = "Uno uno uno. Dos dos dos. Tres tres tres. Cuatro cuatro cuatro.";
    const chunks = partirEnChunks(texto, { objetivo: 30, tope: 45, minimo: 5 });

    expect(chunks.length).toBeGreaterThan(1);
    // La última oración de un chunk reaparece al principio del siguiente.
    for (let i = 0; i < chunks.length - 1; i++) {
      const ultima = chunks[i]!.split(/(?<=\.)\s+/).pop()!;
      expect(chunks[i + 1]).toContain(ultima);
    }
  });

  it("no corta en un número con punto de miles", () => {
    const texto = "Está a 1.750 metros sobre el nivel del mar y produce 250 kilos.";

    expect(partirEnChunks(texto)).toEqual([texto]);
  });

  it("no deja huérfano un párrafo corto al final", () => {
    // Mirando solo hacia adelante, el último párrafo corto no tenía con quién
    // juntarse y quedaba como un chunk de seis caracteres.
    const texto = ["a".repeat(300), "b".repeat(200), "Corto."].join("\n\n");
    const chunks = partirEnChunks(texto);

    expect(chunks[chunks.length - 1]!.length).toBeGreaterThanOrEqual(POR_DEFECTO.minimo);
    expect(chunks[chunks.length - 1]).toContain("Corto.");
  });

  it("no se pasa del máximo al fusionar", () => {
    // Si el vecino no entra, el corto se queda solo: un chunk sobredimensionado
    // ya no se puede volver a partir.
    const texto = ["a".repeat(550), "Corto."].join("\n\n");

    for (const chunk of partirEnChunks(texto)) {
      expect(chunk.length).toBeLessThanOrEqual(POR_DEFECTO.tope);
    }
  });

  it("junta un párrafo demasiado corto con el siguiente", () => {
    const texto = ["Corto.", "b".repeat(300)].join("\n\n");
    const chunks = partirEnChunks(texto);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("Corto.");
  });

  it("ignora los párrafos vacíos", () => {
    // Párrafos por encima del mínimo, para aislar el filtrado de los blancos:
    // dos párrafos cortos se juntarían y no se vería si el vacío sobrevivió.
    const uno = "a".repeat(200);
    const dos = "b".repeat(200);

    expect(partirEnChunks(`${uno}\n\n\n\n   \n\n${dos}`)).toEqual([uno, dos]);
  });

  it("devuelve vacío si no hay texto", () => {
    expect(partirEnChunks("   \n\n  ")).toEqual([]);
  });
});

describe("sobre las fichas reales", () => {
  it("saca varios chunks por ficha, no uno solo", () => {
    for (const g of GRANOS) {
      // Con el chunk de ~500 tokens que decía el spec, cada ficha entraba
      // entera en uno y el retrieval no tenía entre qué elegir.
      expect(partirEnChunks(g.ficha).length, g.clave).toBeGreaterThanOrEqual(4);
    }
  });

  it("no pierde ni inventa texto", () => {
    for (const g of GRANOS) {
      const original = g.ficha.replace(/\s+/g, " ").trim();

      for (const chunk of partirEnChunks(g.ficha)) {
        expect(original, g.clave).toContain(chunk.replace(/\s+/g, " ").trim());
      }
    }
  });
});

describe("el tope es una garantía, el objetivo es una intención", () => {
  /**
   * Esta distinción existe porque el código antes prometía un máximo que no
   * cumplía. Medido con el algoritmo viejo: tres oraciones de 400 con el
   * "máximo" en 600 daban chunks de 799, y una oración de 900 salía entera en
   * un chunk de 901 — el algoritmo se negaba explícitamente a cortar adentro de
   * una oración y no tenía escape.
   *
   * Sobre el corpus real nunca pasaba, así que el test viejo —que comparaba
   * contra el máximo— pasaba igual. Estos casos son los adversariales que lo
   * habrían encontrado.
   */
  const casos: [string, string][] = [
    ["tres oraciones que no entran", `${"A".repeat(398)}. ${"B".repeat(398)}. ${"C".repeat(398)}.`],
    ["una sola oración enorme", `${"X".repeat(2000)}.`],
    ["una oración sin espacios", `${"Y".repeat(1500)}.`],
    ["un párrafo de una línea larguísima", "Z".repeat(3000)],
  ];

  for (const [nombre, texto] of casos) {
    it(`respeta el tope con ${nombre}`, () => {
      for (const chunk of partirEnChunks(texto)) {
        expect(chunk.length, `un chunk de ${chunk.length} pasa el tope`).toBeLessThanOrEqual(
          POR_DEFECTO.tope,
        );
      }
    });
  }

  it("no pierde ni inventa palabras al partir una oración enorme", () => {
    // No se compara la concatenación contra el original a propósito: el
    // solapamiento repite la última oración al abrir el chunk siguiente, así
    // que unir los pedazos da MÁS texto que el que entró. Eso es deliberado.
    //
    // Lo que sí tiene que valer es que cortar por espacios no se coma ni
    // invente nada: el conjunto de palabras que sale es el mismo que entró.
    const palabras = Array.from({ length: 400 }, (_, i) => `palabra${i}`);
    const salida = new Set(partirEnChunks(palabras.join(" ")).flatMap((c) => c.split(/\s+/)));

    for (const palabra of palabras) {
      expect(salida.has(palabra), `se perdió ${palabra}`).toBe(true);
    }
    expect(salida.size, "aparecieron palabras que no estaban").toBe(palabras.length);
  });
});
