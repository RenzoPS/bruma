/**
 * El set con el que se mide si Brumita contesta **bien**.
 *
 * Es distinto de `casos-retrieval.ts` y la diferencia es el punto de este
 * archivo. Aquel mide si la búsqueda vectorial trae el grano correcto, que es
 * una propiedad del corpus. Este mide lo que le pasa a una persona: preguntó
 * algo y recibió una respuesta que sirve, o no.
 *
 * Cada caso declara tres cosas y las tres se puntúan por separado, porque
 * fallan por motivos distintos y se arreglan en lugares distintos:
 *
 *   `tools`      — qué tenía que consultar. Es determinístico y se verifica sin
 *                  modelo: o llamó a `buscarProductos` o no.
 *   `prohibidas` — qué NO tenía que consultar. Existe porque el error caro no es
 *                  no contestar, es contestar un precio desde el retrieval
 *                  vectorial en vez de desde la tabla.
 *   `criterio`   — qué hace que la respuesta sea buena, escrito para que lo
 *                  juzgue un modelo. Es la única parte subjetiva y por eso es la
 *                  única que necesita un juez.
 *
 * **Las preguntas están escritas como las escribiría alguien parado en la
 * puerta**, no como una consulta de base de datos. Si dijeran las palabras
 * exactas de la ficha o de la carta, el ruteo acertaría siempre y no estaríamos
 * midiendo nada.
 *
 * Para agregar un caso: escribí la pregunta primero y recién después mirá qué
 * tool le corresponde. Al revés se escriben preguntas que confirman el diseño
 * que ya existe.
 *
 * ## Cuándo se puede tocar un criterio, y cuándo es hacer trampa
 *
 * Un set de evals se corrompe de una sola forma: aflojando el criterio hasta
 * que el número dé lindo. Contra eso no hay herramienta, hay regla, y la regla
 * es que un criterio se cambia por lo que pide, nunca por lo que da.
 *
 * En la primera corrida de esto se cambiaron cuatro, y los cuatro por estar mal
 * escritos:
 *
 * - "¿a qué hora abren?" exigía además la hora de cierre. Nadie preguntó eso, y
 *   el prompt pide contestar corto: el criterio castigaba obedecer.
 * - "algo bien dulce" exigía el Nariño, que quedó agotado. El criterio pedía
 *   justo lo que la regla de stock prohíbe.
 * - "con leche" y "envíos" enumeraban palabras que tenían que aparecer, en vez
 *   de decir qué hace útil a la respuesta. Un criterio no es un `includes()`.
 *
 * Lo que NO se tocó: el caso del grano frutado, que es el que destapó un precio
 * inventado. Ese se queda duro. La diferencia entre los dos grupos es si el
 * criterio estaba mal escrito o si el sistema estaba contestando mal — y esa
 * pregunta se contesta mirando la respuesta, no el porcentaje.
 */

export type CasoEvaluacion = {
  pregunta: string;
  /** Las que sí o sí tiene que haber consultado. */
  tools: string[];
  /** Las que llamarlas sería un error de ruteo. */
  prohibidas?: string[];
  /** Qué tiene que pasar para que la respuesta cuente como buena. */
  criterio: string;
  idioma?: "es" | "en";
};

export const CASOS: CasoEvaluacion[] = [
  // ── Precio y carta ────────────────────────────────────────────────────────
  {
    pregunta: "¿cuánto sale un flat white?",
    tools: ["buscarProductos"],
    prohibidas: ["buscarEnFichas"],
    criterio: "Dice el precio del flat white, que es $4.800. Una línea, sin rodeos.",
  },
  {
    pregunta: "¿qué tenés para comer que no sea dulce?",
    tools: ["buscarProductos"],
    criterio:
      "Ofrece el tostado de jamón y queso, que es lo único salado de la carta. Puede mencionar el precio. No inventa comida que no está.",
  },
  {
    pregunta: "tengo 3000 pesos, ¿qué me alcanza?",
    tools: ["buscarProductos"],
    criterio:
      "Nombra al menos una opción de $3.000 o menos (medialuna $1.400, alfajor $2.600). No ofrece nada que cueste más de $3.000.",
  },
  {
    pregunta: "¿cuánto sale el submarino con crema?",
    tools: ["buscarProductos"],
    criterio:
      "Dice que no lo tiene o que no está en la carta. NO da un precio: el submarino no existe en BRUMA, así que cualquier número sería inventado.",
  },

  // ── Atributos del grano ───────────────────────────────────────────────────
  {
    pregunta: "¿cuál es el grano más claro que tenés?",
    tools: ["verGranos"],
    criterio: "Identifica el Guji de Etiopía como el de perfil claro. Es el único.",
  },
  {
    pregunta: "¿tenés alguno natural?",
    tools: ["verGranos"],
    criterio: "Nombra el Cerrado de Brasil, que es el único de proceso natural.",
  },
  {
    pregunta: "¿cuál es la bolsa más barata?",
    tools: ["verGranos"],
    prohibidas: ["buscarEnFichas"],
    criterio: "Dice que es el Cerrado de Brasil, a $14.500. El precio tiene que ser ese.",
  },
  {
    pregunta: "¿el de Nariño lo tenés en stock?",
    tools: ["verGranos"],
    criterio: "Dice que el Nariño no tiene stock. Es el único agotado.",
  },

  // ── Sabor y ficha: lo único que vive en el retrieval ──────────────────────
  {
    pregunta: "¿a qué sabe el de Etiopía?",
    tools: ["buscarEnFichas"],
    // Sin enumerar las palabras esperadas: el criterio anterior decía "floral,
    // cítrico, ácido" y el juez lo leyó como una checklist, así que reprobó una
    // respuesta que decía "bergamota, jazmín y té negro" — que es exactamente
    // eso, escrito mejor.
    criterio:
      "Describe a qué sabe el Guji con notas de cata concretas, no con generalidades tipo 'es rico' o 'es suave'.",
  },
  {
    pregunta: "quiero algo bien dulce, casi como con azúcar, ¿cuál me das?",
    tools: ["buscarEnFichas"],
    criterio:
      "Recomienda un origen concreto por su dulzor y da un motivo. Si nombra el Nariño, tiene que aclarar que está agotado.",
  },
  {
    pregunta: "¿cuál va bien para tomar con leche todas las mañanas?",
    tools: ["buscarEnFichas"],
    criterio:
      "Recomienda un origen concreto y da al menos un motivo de sabor o cuerpo que sostenga la recomendación.",
  },
  {
    pregunta: "¿cuál me conviene si uso prensa francesa?",
    tools: ["buscarEnFichas"],
    criterio: "Recomienda un origen concreto y explica el porqué con algo escrito en su ficha.",
  },

  // ── Horario y lugar ───────────────────────────────────────────────────────
  {
    pregunta: "¿a qué hora abren?",
    tools: ["horariosYUbicacion"],
    prohibidas: ["buscarEnFichas"],
    // Preguntaron a qué hora abren, no el horario entero, y el prompt pide
    // contestar corto. Exigir que además diga la hora de cierre sería castigar
    // al asistente por obedecer.
    criterio: "Dice que abren a las 7:30. Puede agregar el cierre o no.",
  },
  {
    pregunta: "¿dónde quedan? ¿hay wifi?",
    tools: ["horariosYUbicacion"],
    criterio: "Da la dirección (Cabrera 4680, Palermo) y confirma que hay wifi.",
  },

  // ── Cruce de fuentes: la razón por la que el ruteo no es un if ────────────
  {
    pregunta: "¿cuál me recomendás para filtrado y cuánto sale la bolsa?",
    tools: ["buscarEnFichas"],
    criterio:
      "Recomienda un origen con un motivo sacado de la ficha Y dice el precio de su bolsa. Las dos mitades, no una.",
  },
  {
    pregunta: "¿qué grano tenés que sea frutado y que me lo pueda llevar hoy?",
    tools: ["buscarEnFichas"],
    // Este es el caso que destapó la alucinación del precio inventado. Se deja
    // con el criterio duro a propósito: es el que hay que mirar si algún día se
    // vuelve a poner rojo.
    criterio:
      "Ofrece para llevar un origen que tenga stock. Si nombra el Nariño, tiene que decir que está agotado — no puede ofrecerlo como disponible.",
  },

  // ── Lo que ninguna tool contesta ─────────────────────────────────────────
  {
    pregunta: "¿hacen envíos al interior?",
    tools: [],
    criterio: "Dice que no hacen envíos. No inventa un servicio de entrega.",
  },
  {
    pregunta: "¿tenés café de Kenia?",
    tools: [],
    criterio:
      "Dice que no tiene Kenia. Puede ofrecer los orígenes que sí hay. Lo que no puede es describir un café de Kenia como si lo vendiera.",
  },
  {
    pregunta: "¿me reservás una mesa para las 9?",
    tools: [],
    criterio: "Dice que no se reservan mesas. No confirma una reserva.",
  },
  {
    pregunta: "¿cómo hago el trámite del pasaporte?",
    tools: [],
    prohibidas: ["buscarEnFichas"],
    criterio:
      "Dice en una línea que no es algo de lo que sepa, sin sermonear y sin ofrecer ayuda genérica.",
  },

  // ── Idioma: lo decide el sitio, no el mensaje ────────────────────────────
  {
    pregunta: "how much is the cortado?",
    tools: ["buscarProductos"],
    idioma: "en",
    // "3.600" y no "$3.600": el juez reprobaba "The cortado is 3,600 pesos" por
    // no traer el signo. El formato del precio no es lo que se está midiendo.
    criterio: "Contesta EN INGLÉS y dice que el cortado sale 3.600, en el formato que sea.",
  },
  {
    pregunta: "¿a qué sabe el de Colombia?",
    tools: ["buscarEnFichas"],
    idioma: "en",
    criterio:
      "Contesta EN INGLÉS aunque le preguntaron en castellano y aunque las fichas estén en castellano.",
  },
];
