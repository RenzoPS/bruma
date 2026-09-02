import { tool } from "ai";
import { z } from "zod";
import {
  buscarProductos,
  horariosYUbicacion,
  verGranos,
} from "../services/catalogo.service.ts";
import { buscarEnFichas } from "../rag/retrieval.ts";
import { CATEGORIAS, PERFILES, PROCESOS } from "../dominio.ts";

/**
 * La whitelist: las únicas cuatro cosas que Brumita puede hacer.
 *
 * Acá está la decisión central del proyecto. El modelo **no escribe SQL**:
 * elige una de estas funciones y le pasa argumentos, que Zod valida antes de
 * que toquen la base. No hay superficie de inyección porque no hay nada
 * generado que ejecutar — no hace falta una lista negra de palabras prohibidas,
 * porque no hay texto libre llegando a la consulta.
 *
 * El ruteo tampoco es un `if` nuestro. Se declaran las cuatro y el modelo elige;
 * eso deja la decisión explícita y auditable, y es lo que el front muestra
 * abajo de cada respuesta. Hacer visible el mecanismo es medio punto de esto.
 *
 * **Las descripciones son código.** Son literalmente lo que decide si una
 * pregunta de precio va a la carta o al retrieval vectorial, así que dicen
 * cuándo usar cada una y no qué devuelve cada una.
 */

const categoria = z
  .enum(CATEGORIAS)
  .describe("cafe: bebidas de barra. acompanar: pastelería y salados. desayuno: combos. grano: bolsas para llevar");

const precioMaximo = z
  .number()
  .positive()
  .describe("Tope en pesos, como lo diría una persona. No en centavos");

/**
 * Los esquemas, aparte de las tools.
 *
 * `tool()` tipa su `inputSchema` como un union de formatos aceptados (Zod,
 * JSON Schema, Valibot), asi que leerlo de vuelta desde la tool no da un objeto
 * Zod: da el union, y no se le puede pedir un safeParse. Declararlos acá deja
 * que tests/herramientas.test.ts valide exactamente lo que valida producción.
 */
export const ESQUEMAS = {
  buscarProductos: z.object({
    categoria: categoria.optional(),
    precioMaximo: precioMaximo.optional(),
    soloDisponibles: z
      .boolean()
      .optional()
      .describe("Por defecto true. Ponelo en false solo si preguntan explícitamente por algo que ya no está"),
  }),

  verGranos: z.object({
    proceso: z
      .enum(PROCESOS)
      .optional()
      .describe("Cómo se benefició el grano después de cosechado"),
    perfil: z.enum(PERFILES).optional().describe("Punto de tueste"),
    precioMaximo: precioMaximo.optional(),
    soloConStock: z.boolean().optional().describe("Por defecto false"),
  }),

  buscarEnFichas: z.object({
    consulta: z
      .string()
      .min(3)
      .max(400)
      .describe("La pregunta en las palabras del visitante, no una keyword suelta: la búsqueda es semántica"),
  }),

  // Gemini pide un esquema de objeto igual cuando la función no lleva
  // argumentos; un objeto vacío es la forma de decir "ninguno".
  horariosYUbicacion: z.object({}),
};

export const herramientas = {
  buscarProductos: tool({
    description:
      "La carta del local: qué se sirve, cuánto sale y qué está disponible hoy. " +
      "Usala para CUALQUIER pregunta de precio o de qué hay. Los precios son exactos y salen de acá, nunca de tu memoria. " +
      "Sin argumentos devuelve la carta entera.",
    inputSchema: ESQUEMAS.buscarProductos,
    execute: ({ categoria, precioMaximo, soloDisponibles }) =>
      buscarProductos({ categoria, precioMaximo, soloDisponibles }),
  }),

  verGranos: tool({
    description:
      "Los atributos exactos de cada origen que BRUMA tuesta: proceso, perfil de tueste, altura, precio de la bolsa y stock. " +
      "Usala para filtrar y comparar orígenes ('¿cuál es el más claro?', '¿tenés alguno natural?', '¿cuánto sale la bolsa?'). " +
      "NO devuelve a qué saben: para eso está buscarEnFichas.",
    inputSchema: ESQUEMAS.verGranos,
    execute: ({ proceso, perfil, precioMaximo, soloConStock }) =>
      verGranos({ proceso, perfil, precioMaximo, soloConStock }),
  }),

  buscarEnFichas: tool({
    description:
      "Busca en las fichas de los orígenes, que están escritas en prosa: a qué sabe cada grano, sus notas de cata, " +
      "de dónde viene, la finca, cómo prepararlo, para quién es. " +
      "Usala para todo lo que sea sabor, matiz o recomendación. Es lo único que no podés saber de antemano. " +
      "Si no vuelve nada, no hay información propia sobre eso y tenés que decirlo.",
    inputSchema: ESQUEMAS.buscarEnFichas,
    // Se devuelve la similitud junto con el texto a propósito: el front la
    // muestra, y un chunk que entró raspando el umbral se ve distinto de uno
    // que entró cómodo.
    //
    // El `idioma` viaja con los chunks porque acá está el ancla: las fichas
    // están en castellano y son lo más reciente del contexto cuando el modelo
    // redacta, así que sin este aviso una respuesta en inglés se le escapaba al
    // castellano. Quién decide el idioma no es esto —eso lo fija
    // `directivaDeIdioma`—, esto solo avisa que la fuente no lo determina.
    execute: async ({ consulta }) => ({
      idioma:
        "Estos textos están en castellano porque así está escrito el corpus. NO definen el idioma de tu respuesta: "
        + "seguí la instrucción de idioma del sistema y traducí el contenido si hace falta.",
      chunks: await buscarEnFichas(consulta),
    }),
  }),

  horariosYUbicacion: tool({
    description:
      "Dirección, horario de atención, cuántas mesas hay y si hay wifi. Usala para cualquier pregunta de cuándo o dónde.",
    inputSchema: ESQUEMAS.horariosYUbicacion,
    execute: async () => horariosYUbicacion(),
  }),
};

export type Herramientas = typeof herramientas;
