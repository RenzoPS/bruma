import { afterAll, describe, expect, it } from "vitest";
import { conexion, db } from "../../src/db/client.ts";
import { chunks } from "../../src/db/schema.ts";
import { MODELO } from "../../src/rag/embeddings.ts";
import { huellaDeFicha } from "../../src/rag/chunking.ts";
import { granos } from "../../src/db/schema.ts";
import { eq } from "drizzle-orm";
import {
  MAXIMO,
  UMBRAL,
  buscarEnFichas,
} from "../../src/rag/retrieval.ts";
import { verGranos } from "../../src/services/catalogo.service.ts";
import { EN_DOMINIO, FUERA_DE_DOMINIO_CERCANO, FUERA_DE_DOMINIO_LEJANO } from "../casos-retrieval.ts";

/**
 * El retrieval, contra la base y contra Gemini de verdad.
 *
 * El spec es explícito en esto: **el retrieval se prueba antes de que exista el
 * chat.** Si se arma el chat primero, un error de recuperación queda tapado por
 * un modelo que responde bien igual, y no hay forma de saber si el RAG anda.
 *
 * Requiere el stack arriba y los chunks indexados:
 *   docker compose up -d postgres && pnpm db:setup && pnpm rag:ingest
 *
 * Cada caso es una llamada a la API de embeddings, así que esta suite tarda y
 * gasta cuota. Por eso vive aparte de `pnpm test`.
 */

afterAll(async () => {
  await conexion.end();
});

describe("precondiciones", () => {
  it("el indice se genero con el modelo que se esta usando", async () => {
    // Un vector de otro modelo no es comparable con el de este, aunque tenga la
    // misma cantidad de numeros: la busqueda recupera peor y no falla. Si este
    // test se pone rojo, falta `pnpm rag:ingest`.
    const filas = await db.select({ modelo: chunks.modeloEmbedding }).from(chunks);
    const otros = [...new Set(filas.map((f) => f.modelo))].filter((m) => m !== MODELO);

    expect(otros, `hay chunks de ${otros.join(", ")}`).toEqual([]);
  });

  it("el indice corresponde a las fichas que hay hoy", async () => {
    // El caso real: alguien corrige una ficha, corre `db:maestros` y se olvida
    // de `rag:ingest`. La busqueda no falla — contesta con el texto viejo, sin
    // sintoma. Si este test se pone rojo, falta `pnpm rag:ingest`.
    const filas = await db
      .select({ clave: granos.clave, ficha: granos.ficha, guardada: chunks.fichaHash })
      .from(granos)
      .innerJoin(chunks, eq(chunks.granoId, granos.id))
      .where(eq(chunks.posicion, 0));

    const viejas = filas.filter((f) => f.guardada !== huellaDeFicha(f.ficha)).map((f) => f.clave);

    expect(viejas, `el indice quedo viejo para: ${viejas.join(", ")}`).toEqual([]);
  });

  it("hay chunks indexados", async () => {
    const filas = await db.select({ id: chunks.id }).from(chunks);

    expect(
      filas.length,
      "no hay chunks: corré `pnpm db:setup && pnpm rag:ingest`",
    ).toBeGreaterThan(0);
  });
});

describe("buscarEnFichas", () => {
  it("no llama a la API con una consulta vacía", async () => {
    expect(await buscarEnFichas("   ")).toEqual([]);
  });

  it("devuelve como mucho el máximo declarado", async () => {
    const r = await buscarEnFichas("café", { umbral: 0 });

    expect(r.length).toBeLessThanOrEqual(MAXIMO);
  });

  it("ordena por similitud descendente", async () => {
    const r = await buscarEnFichas("cuál va bien con leche", { umbral: 0 });
    const similitudes = r.map((c) => c.similitud);

    expect(similitudes).toEqual([...similitudes].sort((a, b) => b - a));
  });

  it("cita el grano de cada chunk, para poder mostrar la fuente", async () => {
    const [top] = await buscarEnFichas("cuál tiene gusto a chocolate");

    expect(top?.granoClave).toBeTruthy();
    expect(top?.granoNombre).toBeTruthy();
    // El contenido citado tiene que ser el texto real, no un id.
    expect(top?.contenido.length).toBeGreaterThan(100);
  });

  /**
   * Los datos duros viajan con la prosa, y este test es lo que lo sostiene.
   *
   * Sin ellos el modelo tenía la descripción de un grano y ningún precio ni
   * stock, y completaba el hueco: `pnpm rag:evaluar` lo agarró recomendando el
   * Nariño —agotado— a $18.500, un precio que no existe. Ver la migración 0005.
   *
   * Se compara contra `verGranos` y no contra un número escrito acá: los dos
   * tienen que leer el mismo dato de la misma tabla, y eso es lo que hay que
   * probar. Un literal se quedaría viejo el día que cambie un precio.
   */
  it("trae el precio y el stock del grano, iguales a los del catálogo", async () => {
    const [chunk] = await buscarEnFichas("cuál tiene gusto a chocolate");
    expect(chunk, "no recuperó nada con lo que comparar").toBeDefined();

    const catalogo = await verGranos();
    const grano = catalogo.find((g) => g.nombre === chunk!.granoNombre);

    expect(grano, `${chunk!.granoNombre} no está en el catálogo`).toBeDefined();
    expect(chunk!.granoPrecio, "el precio del chunk no es el del catálogo").toBe(grano!.precio);
    expect(chunk!.granoStock, "el stock del chunk no es el del catálogo").toBe(grano!.stock);
  });

  it("marca como agotado el grano que no tiene stock", async () => {
    // Que el retrieval devuelva un agotado está bien —alguien puede preguntar a
    // qué sabe— pero tiene que venir marcado. Que llegue sin marca es lo que
    // hacía que Brumita lo ofreciera como disponible.
    const chunks = await buscarEnFichas("durazno, miel y fruta madura, bien dulce");
    const agotados = chunks.filter((c) => !c.granoStock);

    const catalogo = await verGranos();
    const sinStock = new Set(catalogo.filter((g) => !g.stock).map((g) => g.nombre));

    for (const chunk of agotados) {
      expect(sinStock.has(chunk.granoNombre), `${chunk.granoNombre} no está agotado`).toBe(true);
    }
  });
});

describe("el umbral separa lo que sabe de lo que no", () => {
  it("no recupera nada para preguntas lejanas al dominio", async () => {
    for (const pregunta of FUERA_DE_DOMINIO_LEJANO) {
      const r = await buscarEnFichas(pregunta);

      expect(r, `recuperó algo para: "${pregunta}"`).toEqual([]);
    }
  });

  /**
   * Este test afirma lo contrario de lo que uno querría, y es a propósito.
   *
   * Las preguntas cercanas —"¿tienen descafeinado?", "¿tienen un grano de
   * Kenia?"— **sí pasan el umbral**, porque hablan de café con el mismo
   * vocabulario que las fichas. Medido: dan hasta 0.693 contra 0.627 de la peor
   * pregunta legítima, así que el hueco entre los conjuntos es negativo.
   *
   * Está escrito como test para que quede fijo lo que el umbral NO hace. Si
   * algún día alguien sube el número creyendo que así las filtra, va a romper
   * primero las preguntas legítimas: el techo real es 0.627.
   *
   * Quien las resuelve es el ruteo de tools, y eso se prueba en
   * tests/integracion/brumita.test.ts.
   */
  it("las preguntas cercanas al dominio pasan el umbral: no las filtra este nivel", async () => {
    const pasan = [];
    for (const pregunta of FUERA_DE_DOMINIO_CERCANO) {
      if ((await buscarEnFichas(pregunta)).length > 0) pasan.push(pregunta);
    }

    expect(pasan.length, "ninguna pasó: el umbral quedó más alto de lo medido").toBeGreaterThan(0);
  });

  it("recupera algo para todas las preguntas legítimas", async () => {
    for (const { pregunta } of EN_DOMINIO) {
      const r = await buscarEnFichas(pregunta);

      expect(r.length, `no recuperó nada para: "${pregunta}"`).toBeGreaterThan(0);
    }
  });

  it("deja margen entre el umbral y la peor pregunta legítima", async () => {
    const peores = await Promise.all(
      EN_DOMINIO.map(async ({ pregunta }) => {
        const [top] = await buscarEnFichas(pregunta, { umbral: 0, maximo: 1 });
        return top?.similitud ?? 0;
      }),
    );

    // Si esto se rompe, el umbral quedó pegado al borde y hay que volver a
    // correr `pnpm rag:calibrar` en vez de mover el número a mano.
    expect(Math.min(...peores)).toBeGreaterThan(UMBRAL);
  });
});

describe("acierta el grano correcto", () => {
  it("trae primero el grano esperado en al menos el 90% de los casos", async () => {
    const fallos: string[] = [];

    for (const { pregunta, grano } of EN_DOMINIO) {
      const [top] = await buscarEnFichas(pregunta, { maximo: 1 });
      if (top?.granoClave !== grano) {
        fallos.push(`"${pregunta}" → ${top?.granoClave ?? "nada"} (esperaba ${grano})`);
      }
    }

    const aciertos = EN_DOMINIO.length - fallos.length;

    // No se exige 18/18. "Quiero algo distinto a lo que tomo siempre" trae el
    // Huila en vez del Guji, y es defendible: esa frase identifica al Guji en
    // el diccionario del front, pero no está en su ficha. Subir la nota
    // editando la ficha para que contenga la respuesta sería tunear el corpus
    // contra el test, que es medirse a uno mismo con la regla propia.
    expect(aciertos / EN_DOMINIO.length, `fallos:\n  ${fallos.join("\n  ")}`).toBeGreaterThanOrEqual(0.9);
  });
});
