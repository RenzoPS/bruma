import { conexion } from "../db/client.ts";
import { buscarEnFichas, MAXIMO } from "../rag/retrieval.ts";
import {
  EN_DOMINIO,
  FUERA_DE_DOMINIO_CERCANO,
  FUERA_DE_DOMINIO_LEJANO,
} from "../../tests/casos-retrieval.ts";

/**
 * Mide el retrieval en vez de opinar sobre él, y de ahí sale el umbral.
 *
 * Contesta **dos preguntas distintas**, y separarlas es el punto de este
 * script. La primera versión las mezclaba: metía la similitud del top-1 en el
 * conjunto de las legítimas aunque ese top-1 fuera el grano equivocado. O sea,
 * un error de recuperación —que ningún umbral arregla— terminaba corriendo el
 * umbral. Un caso que recuperaba mal con 0.81 subía el piso de las legítimas y
 * hacía ver el corpus más separable de lo que era.
 *
 *   1. RECUPERACIÓN — ¿trae el grano correcto? Top-1 y Recall@5.
 *      Es un problema de corpus y de chunking. Si esto falla, calibrar no tiene
 *      sentido: el script corta.
 *
 *   2. SEPARACIÓN — ¿se puede distinguir una pregunta del dominio de una que
 *      no lo es? Acá sí manda el umbral, y se calcula con la similitud del
 *      **chunk correcto**, no con la del que salió primero.
 *
 * El umbral depende del corpus: se vuelve a medir cada vez que cambian las
 * fichas, con `pnpm rag:calibrar`.
 */

/** Sin umbral y trayendo todo: para poder ver en qué puesto quedó el correcto. */
const TODO = { umbral: 0, maximo: 50 };

type Fallo = { pregunta: string; esperado: string; obtenido: string; puesto: number };

async function main() {
  const legitimas: number[] = [];
  const lejanas: number[] = [];
  const cercanas: number[] = [];
  const sinTop1: Fallo[] = [];
  const sinRecall: Fallo[] = [];

  console.log("RECUPERACIÓN — ¿trae el grano correcto?\n");

  for (const { pregunta, grano } of EN_DOMINIO) {
    const filas = await buscarEnFichas(pregunta, TODO);
    const puesto = filas.findIndex((f) => f.granoClave === grano);
    const correcto = puesto === -1 ? undefined : filas[puesto]!;

    const fallo = {
      pregunta,
      esperado: grano,
      obtenido: filas[0]?.granoClave ?? "-",
      puesto: puesto + 1,
    };
    if (puesto !== 0) sinTop1.push(fallo);
    if (puesto === -1 || puesto >= MAXIMO) sinRecall.push(fallo);

    // Lo que entra en el cálculo del umbral es la similitud del chunk correcto.
    // Si no aparece en ningún puesto, no hay número honesto que aportar.
    if (correcto) legitimas.push(correcto.similitud);

    const marca = puesto === 0 ? "ok " : puesto === -1 ? "NO " : `#${puesto + 1} `;
    console.log(
      `  ${(correcto?.similitud ?? 0).toFixed(3)}  ${marca} ` +
        `${(filas[0]?.granoClave ?? "-").padEnd(8)} ${pregunta}`,
    );
  }

  const total = EN_DOMINIO.length;
  console.log(`\n  Top-1 correcto : ${total - sinTop1.length}/${total}`);
  console.log(`  Recall@${MAXIMO}      : ${total - sinRecall.length}/${total}`);

  for (const f of sinTop1) {
    console.log(`    · "${f.pregunta}" → esperaba ${f.esperado}, trajo ${f.obtenido} (correcto en el puesto ${f.puesto || "ninguno"})`);
  }

  console.log("\nAJENAS LEJANAS — el umbral sí las filtra\n");

  for (const pregunta of FUERA_DE_DOMINIO_LEJANO) {
    const [top] = await buscarEnFichas(pregunta, TODO);
    lejanas.push(top?.similitud ?? 0);
    console.log(`  ${(top?.similitud ?? 0).toFixed(3)}       ${pregunta}`);
  }

  console.log("\nAJENAS CERCANAS — hablan de café, la respuesta no está en las fichas\n");

  for (const pregunta of FUERA_DE_DOMINIO_CERCANO) {
    const [top] = await buscarEnFichas(pregunta, TODO);
    cercanas.push(top?.similitud ?? 0);
    console.log(`  ${(top?.similitud ?? 0).toFixed(3)}       ${pregunta}`);
  }

  console.log(`\n${"─".repeat(64)}`);

  // Calibrar sobre un retrieval que trae el documento equivocado es elegir un
  // número para un sistema que ya está roto por otro lado.
  if (sinRecall.length > 0) {
    console.log(
      `\nEl grano correcto no entra en los primeros ${MAXIMO} en ${sinRecall.length} caso(s).\n` +
        `Eso no lo arregla ningún umbral: es el corpus o el chunking.\n` +
        `No se sugiere umbral hasta que la recuperación esté bien.`,
    );
    process.exitCode = 1;
    return;
  }

  const peorLegitima = Math.min(...legitimas);
  const mejorLejana = Math.max(...lejanas);
  const mejorCercana = Math.max(...cercanas);
  const hueco = peorLegitima - mejorLejana;

  console.log(`peor pregunta legítima (chunk correcto) : ${peorLegitima.toFixed(4)}`);
  console.log(`mejor ajena lejana                      : ${mejorLejana.toFixed(4)}`);
  console.log(`hueco contra las lejanas                : ${hueco.toFixed(4)}`);
  console.log(`mejor ajena cercana                     : ${mejorCercana.toFixed(4)}`);

  if (hueco <= 0) {
    console.log("\nNi contra las lejanas hay hueco: ningún umbral sirve.");
    console.log("El corpus o las preguntas necesitan revisión antes de fijar un número.");
    process.exitCode = 1;
    return;
  }

  // El umbral se calibra contra las lejanas, que es lo único que puede separar.
  // Las cercanas se reportan para que quede a la vista qué NO hace este número.
  if (mejorCercana >= peorLegitima) {
    console.log(
      `\nLas ajenas cercanas llegan a ${mejorCercana.toFixed(4)}, por encima de la peor legítima.\n` +
        `Ningún umbral las separa, y subirlo para intentarlo rompe preguntas reales:\n` +
        `el techo es ${peorLegitima.toFixed(4)}. A esas las resuelve el ruteo de tools,\n` +
        `y eso se prueba en tests/integracion/brumita.test.ts.`,
    );
  }

  // Tres decimales y no dos: con un hueco de centésimas, redondear a 0.01 puede
  // mover el umbral fuera del hueco que se acaba de medir.
  console.log(`\numbral sugerido                         : ${(mejorLejana + hueco / 2).toFixed(3)}`);
  if (sinTop1.length > 0) {
    console.log(`\nOjo: ${sinTop1.length} caso(s) no traen el correcto primero. Separan bien, pero el orden no es el mejor.`);
  }
}

main()
  .then(() => conexion.end())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await conexion.end();
    process.exit(1);
  });
