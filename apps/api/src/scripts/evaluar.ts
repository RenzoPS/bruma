import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { conexion } from "../db/client.ts";
import { responder } from "../agente/brumita.ts";
import { CASOS, type CasoEvaluacion } from "../../tests/casos-evaluacion.ts";

/**
 * Mide si Brumita contesta bien, no solo si consulta lo correcto.
 *
 * Es la pieza que faltaba. `pnpm rag:calibrar` mide el retrieval y la suite de
 * integración mide el ruteo; las dos son propiedades del sistema. Ninguna
 * contesta la pregunta que de verdad importa: **¿la respuesta le sirve a quien
 * preguntó?**
 *
 * Se puntúa en tres ejes separados, y separarlos es el diseño entero de esto:
 * una respuesta puede rutear perfecto y contestar cualquier cosa, o contestar
 * bien citando un número inventado. Mezclarlos en un solo porcentaje esconde
 * cuál de los tres se rompió.
 *
 *   1. RUTEO      — determinístico. Llamó a las tools que correspondía y no a
 *                   las que no. Sin modelo de por medio.
 *
 *   2. FUNDAMENTO — determinístico, y es el eje más importante. Todo número de
 *                   tres cifras o más que aparece en la respuesta tiene que
 *                   aparecer también en lo que devolvieron las tools. Un precio
 *                   que no está en la salida de `buscarProductos` es un precio
 *                   inventado, y eso se puede probar sin opinar.
 *
 *   3. RESPUESTA  — juzgado por un modelo, porque "¿esto contesta la pregunta?"
 *                   no tiene forma determinística. Es el único eje con juez, a
 *                   propósito: un juez es caro, es lento y puede equivocarse, y
 *                   usarlo para lo que un `includes()` resuelve sería cambiar
 *                   una certeza por una probabilidad.
 *
 * Corre a mano y gasta cuota: dos llamadas por caso, veintidós casos.
 *
 *   pnpm rag:evaluar
 */

/**
 * El juez es otro modelo, y hay que decir qué NO garantiza eso.
 *
 * Un juez comparte los sesgos de la familia de modelos que juzga y tiende a
 * aprobar respuestas que suenan seguras. Por eso solo se le pregunta lo que no
 * se puede medir —si la respuesta responde— y el fundamento, que es donde vive
 * el riesgo real, se verifica con aritmética.
 *
 * Se usa flash-lite y no un modelo grande: la cuota gratuita es la que hay, y
 * comparar una respuesta contra un criterio escrito es una tarea de lectura, no
 * de razonamiento.
 */
const JUEZ = "gemini-3.5-flash-lite";

const veredicto = z.object({
  cumple: z.boolean().describe("true solo si la respuesta cumple el criterio entero"),
  motivo: z.string().max(160).describe("Una línea. Si no cumple, qué le faltó"),
});

/**
 * Los números que una respuesta afirma.
 *
 * De tres cifras para arriba y sin separadores de miles: eso deja adentro los
 * precios (1.400 a 18.000), las alturas (1.150 a 2.100) y los gramos (250), que
 * son los datos que se pueden inventar con cara de seguridad. Deja afuera los
 * de una y dos cifras.
 *
 * **Ese recorte es una decisión, no un olvido.** "12 mesas" y "7:30" son
 * números de dos cifras o menos y también podrían ser falsos; el problema es que
 * a esa longitud cualquier dígito suelto de la salida de una tool coincide por
 * azar, y un chequeo que casi siempre da verde no chequea nada. El eje mide lo
 * que puede medir bien.
 */
const cifras = (texto: string) =>
  [...texto.replace(/[.,](?=\d{3}\b)/g, "").matchAll(/\d{3,}/g)].map(([n]) => n);

type Puntaje = {
  caso: CasoEvaluacion;
  respuesta: string;
  tools: string[];
  ruteo: boolean;
  fundamento: boolean;
  inventadas: string[];
  responde: boolean;
  motivo: string;
};

async function evaluar(caso: CasoEvaluacion): Promise<Puntaje> {
  const corrida = responder([{ role: "user", content: caso.pregunta }], caso.idioma ?? "es");

  const llamadas = await corrida.toolCalls;
  const resultados = await corrida.toolResults;
  const respuesta = await corrida.text;
  const tools = [...new Set(llamadas.map((l) => l.toolName))].sort();

  const ruteo =
    caso.tools.every((t) => tools.includes(t)) &&
    !(caso.prohibidas ?? []).some((t) => tools.includes(t));

  // Todo lo que las tools devolvieron, como un solo texto contra el que
  // contrastar. Se serializa a JSON porque es la forma exacta en la que el
  // modelo lo recibió: si un número no está acá, el modelo no lo leyó de una
  // tool.
  const evidencia = JSON.stringify(resultados).replace(/[.,](?=\d{3}\b)/g, "");
  const inventadas = cifras(respuesta).filter((n) => !evidencia.includes(n));

  const { object } = await generateObject({
    model: google(JUEZ),
    schema: veredicto,
    temperature: 0,
    system:
      "Sos un evaluador estricto de respuestas de un asistente de cafetería. " +
      "Te dan una pregunta, un criterio de qué haría buena a la respuesta, y la respuesta. " +
      "Decidís si cumple el criterio ENTERO. No premies que suene bien: si el criterio pide dos cosas y trae una, no cumple. " +
      "Si el criterio dice que tiene que negar algo y la respuesta lo afirma, no cumple. " +
      "Una respuesta corta que cumple es mejor que una larga que cumple. " +
      // Sin esto el juez busca las palabras del criterio adentro de la
      // respuesta. Medido: reprobó "bergamota, jazmín y té negro" porque el
      // criterio decía "floral, cítrico" y esas dos palabras no aparecían.
      "IMPORTANTE: juzgá el significado, no las palabras. Si el criterio menciona ejemplos, son ejemplos y no una lista " +
      "obligatoria: una respuesta que dice lo mismo con otras palabras cumple. El formato tampoco cuenta — un precio " +
      "escrito '3.600', '3,600' o '$3600' es el mismo precio.",
    prompt: `PREGUNTA: ${caso.pregunta}\n\nCRITERIO: ${caso.criterio}\n\nRESPUESTA: ${respuesta}`,
    maxRetries: 3,
  });

  return {
    caso,
    respuesta,
    tools,
    ruteo,
    fundamento: inventadas.length === 0,
    inventadas,
    responde: object.cumple,
    motivo: object.motivo,
  };
}

/**
 * Un hueco entre casos, por la misma cuota de siempre.
 *
 * Medido en esta suite: el free tier del flash-lite corta en 15 pedidos por
 * minuto, y cada caso hace dos llamadas. Sin el hueco, la corrida se lleva
 * puesta la cuota a la mitad y los casos que siguen fallan por 429 — que se lee
 * igual que un fallo de calidad y no lo es.
 */
const HUECO_MS = 4_000;
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

async function main() {
  console.log(`Evaluando ${CASOS.length} casos. Dos llamadas por caso, así que esto tarda.\n`);

  const puntajes: Puntaje[] = [];

  for (const [i, caso] of CASOS.entries()) {
    if (i > 0) await esperar(HUECO_MS);

    const p = await evaluar(caso);
    puntajes.push(p);

    const marca = (ok: boolean) => (ok ? "·" : "X");
    console.log(
      `  ${marca(p.ruteo)}${marca(p.fundamento)}${marca(p.responde)}  ${caso.pregunta}`,
    );
    if (!p.ruteo) console.log(`        ruteo: esperaba [${caso.tools}], llamó [${p.tools}]`);
    if (!p.fundamento) console.log(`        inventó estos números: ${p.inventadas.join(", ")}`);
    if (!p.responde) console.log(`        respuesta: ${p.motivo}`);
  }

  const total = puntajes.length;
  const cuenta = (eje: (p: Puntaje) => boolean) => puntajes.filter(eje).length;
  const ruteo = cuenta((p) => p.ruteo);
  const fundamento = cuenta((p) => p.fundamento);
  const responde = cuenta((p) => p.responde);
  const enteros = cuenta((p) => p.ruteo && p.fundamento && p.responde);

  const pct = (n: number) => `${n}/${total} (${Math.round((n / total) * 100)}%)`;

  console.log(`\n${"─".repeat(64)}\n`);
  console.log(`RUTEO       consultó lo que correspondía : ${pct(ruteo)}`);
  console.log(`FUNDAMENTO  no inventó ningún número     : ${pct(fundamento)}`);
  console.log(`RESPUESTA   contesta lo que se preguntó  : ${pct(responde)}`);
  console.log(`\nLos tres a la vez                        : ${pct(enteros)}`);

  // Fundamento es el único eje que corta la corrida. Un ruteo raro que igual
  // contesta bien es una molestia; un número inventado es el sistema fallando
  // en lo único que prometió, así que sale distinto de cero y un CI lo puede
  // usar como puerta.
  if (fundamento < total) {
    console.log(`\nHay respuestas con números que ninguna tool devolvió. Eso es alucinación.`);
    process.exitCode = 1;
  }
}

main()
  .then(() => conexion.end())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await conexion.end();
    process.exit(1);
  });
