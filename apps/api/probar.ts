import { embeberConsulta } from "./src/rag/embeddings.ts";
import { conexion } from "./src/db/client.ts";

const coseno = (a: number[], b: number[]) => {
  let p = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { p += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2; }
  return p / (Math.sqrt(na) * Math.sqrt(nb));
};

const frases = [
  "un café con notas florales y mucha acidez",
  "algo frutado y brillante, nada amargo",      // dice lo mismo con otras palabras
  "cómo cambio la rueda del auto",              // no tiene nada que ver
];

const v = await Promise.all(frases.map(embeberConsulta));

console.log(`cada frase se convierte en ${v[0]!.length} números.`);
console.log(`los primeros 6 de la frase 1: [${v[0]!.slice(0, 6).map((n) => n.toFixed(4)).join(", ")}, …]\n`);
console.log("y la distancia entre esos vectores es lo único que Postgres compara:\n");
console.log(`  frase 1 vs frase 2 (mismo significado, otras palabras) : ${coseno(v[0]!, v[1]!).toFixed(4)}`);
console.log(`  frase 1 vs frase 3 (nada que ver)                      : ${coseno(v[0]!, v[2]!).toFixed(4)}`);
console.log(`\n  ninguna comparte una sola palabra con la otra.`);
await conexion.end();
