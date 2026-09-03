import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { consultandoAhora, fuentesDe, textoDe } from "@/lib/brumita";

/**
 * Lo que el front deduce de un mensaje, sin React de por medio.
 *
 * Estas tres funciones son la parte del front que puede estar mal **sin que se
 * vea mal**: leen las partes de tool de un mensaje y de ahi sale el "Consultó:
 * Carta" que va abajo de cada respuesta. Ese rotulo es la mitad visible del
 * ruteo y el argumento de que Brumita no puede mentir sobre lo que miro — si lo
 * calculan mal, el sitio afirma algo falso con cara de dato.
 *
 * Son puras y no tocan el DOM, asi que no hace falta jsdom ni una libreria de
 * testing de componentes. El resto del front es composicion y animacion, que se
 * mira, no se asserta.
 */

/** Un mensaje del asistente con las partes que se le pasen. */
const mensaje = (partes: unknown[]): UIMessage =>
  ({ id: "m1", role: "assistant", parts: partes }) as UIMessage;

const textoParte = (text: string) => ({ type: "text", text });

const toolParte = (tool: string, state: string, output?: unknown) => ({
  type: `tool-${tool}`,
  toolCallId: `c-${tool}`,
  state,
  ...(output === undefined ? {} : { output }),
});

describe("textoDe", () => {
  it("junta las partes de texto y deja afuera las de tool", () => {
    const m = mensaje([textoParte("El flat white "), toolParte("buscarProductos", "output-available", []), textoParte("sale $4.800.")]);

    expect(textoDe(m)).toBe("El flat white sale $4.800.");
  });

  it("devuelve vacio cuando el turno todavia no escribio nada", () => {
    // Es el caso de la burbuja en blanco: el modelo gasto sus pasos llamando
    // tools y no llego a redactar. El panel lo usa para mostrar el reintento en
    // vez de un turno vacio.
    expect(textoDe(mensaje([toolParte("buscarEnFichas", "output-available", { chunks: [] })]))).toBe("");
  });
});

describe("fuentesDe", () => {
  it("nombra cada tool que corrio, una sola vez", () => {
    const m = mensaje([
      toolParte("buscarEnFichas", "output-available", { chunks: [] }),
      toolParte("buscarEnFichas", "output-available", { chunks: [] }),
      toolParte("verGranos", "output-available", []),
      textoParte("..."),
    ]);

    expect(fuentesDe(m).map((f) => f.tool)).toEqual(["buscarEnFichas", "verGranos"]);
  });

  it("saca los granos citados de la salida de buscarEnFichas, sin repetir", () => {
    // Es el dato que le sirve a la persona: no "consulte las fichas" sino
    // "esto sale de la ficha del Huila".
    const m = mensaje([
      toolParte("buscarEnFichas", "output-available", {
        chunks: [
          { granoNombre: "Huila, Colombia" },
          { granoNombre: "Huila, Colombia" },
          { granoNombre: "Guji, Etiopía" },
        ],
      }),
    ]);

    expect(fuentesDe(m)[0]?.granos).toEqual(["Huila, Colombia", "Guji, Etiopía"]);
  });

  it("no inventa granos si la tool todavia no devolvio", () => {
    const m = mensaje([toolParte("buscarEnFichas", "input-available")]);
    const [fuente] = fuentesDe(m);

    expect(fuente?.tool).toBe("buscarEnFichas");
    expect(fuente?.granos).toEqual([]);
  });

  it("un mensaje sin tools no declara ninguna fuente", () => {
    // Importa: el rotulo "Consultó" no puede aparecer cuando el modelo contesto
    // de memoria. Es justamente lo que hace creible al resto.
    expect(fuentesDe(mensaje([textoParte("No lo tengo.")]))).toEqual([]);
  });
});

describe("consultandoAhora", () => {
  it("informa la tool que esta corriendo en este momento", () => {
    const m = mensaje([
      toolParte("buscarProductos", "output-available", []),
      toolParte("buscarEnFichas", "input-available"),
    ]);

    expect(consultandoAhora(m)).toBe("buscarEnFichas");
  });

  it("no informa nada cuando todas terminaron", () => {
    const m = mensaje([toolParte("buscarProductos", "output-available", [])]);

    expect(consultandoAhora(m)).toBeUndefined();
  });

  it("tolera que no haya mensaje", () => {
    // Pasa en el primer render, antes de la primera pregunta.
    expect(consultandoAhora(undefined)).toBeUndefined();
  });
});
