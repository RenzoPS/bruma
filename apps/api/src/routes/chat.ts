import { Router } from "express";
import validate, { type ErrorRequestHandler } from "express-zod-safe";
import { pipeUIMessageStreamToResponse, toUIMessageStream, type ModelMessage } from "ai";
import { z } from "zod";
import { limitarPorIp } from "../lib/limite.ts";
import { responder } from "../agente/brumita.ts";
import { conRastro, desde, nuevoRastro, registro } from "../lib/registro.ts";

/**
 * El endpoint de la conversación.
 *
 * Lo que llega es lo que el front tenga en pantalla, y el front es de cualquiera
 * que abra las devtools. Por eso el cuerpo no se pasa por `convertToModelMessages`
 * tal como viene: se valida contra un esquema angosto —solo roles conocidos y
 * solo partes de texto— y el ModelMessage se arma acá. Cualquier otra cosa que
 * el cliente mande (una parte de tool inventada, un rol "system" con
 * instrucciones nuevas) no tiene por dónde entrar, porque no está en el esquema.
 *
 * La validación es middleware declarativo y no código adentro del handler: para
 * cuando la función corre, el cuerpo ya está validado **y tipado**. Ver la nota
 * de `express-zod-safe` en el README.
 */

/** Lo que entra en una pregunta de barra. Más que esto es otra cosa. */
const LARGO_MAXIMO = 1_000;

/**
 * Cuántos mensajes se aceptan y cuántos se le mandan al modelo.
 *
 * El tope duro corta un payload absurdo; el de contexto corta por lo viejo, no
 * por lo nuevo, porque el contexto que importa es el final de la charla. Son
 * dos números distintos a propósito: una charla larga se recorta, no se
 * rechaza.
 */
const HISTORIAL_MAXIMO = 100;
const CONTEXTO_MAXIMO = 20;

const parte = z.object({
  type: z.string({ error: "Cada parte de un mensaje tiene que declarar su tipo" }),
  text: z
    .string()
    .max(LARGO_MAXIMO, { error: `Una pregunta no puede pasar de ${LARGO_MAXIMO} caracteres` })
    .optional(),
});

const mensaje = z.object({
  // El enum es la puerta cerrada: un rol "system" con instrucciones nuevas no
  // entra porque no está en la lista, no porque lo filtremos.
  role: z.enum(["user", "assistant"], { error: "Rol de mensaje desconocido" }),
  parts: z.array(parte, { error: "Un mensaje tiene que traer sus partes" }),
});

/** El texto de un mensaje: se ignora todo lo que no sea una parte de texto. */
const textoDe = (m: z.infer<typeof mensaje>) =>
  m.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();

const cuerpo = z.object({
  /**
   * En que idioma esta leyendo el sitio el visitante. Lo manda el front, que es
   * el unico que lo sabe con certeza, y decide el idioma de la respuesta: ver
   * `directivaDeIdioma`. Opcional y por defecto castellano, para que un cliente
   * viejo o un curl a mano sigan funcionando.
   */
  idioma: z.enum(["es", "en"]).optional(),
  messages: z
    .array(mensaje, { error: "El cuerpo no tiene la forma de una conversación" })
    .min(1, { error: "Falta la pregunta" })
    .max(HISTORIAL_MAXIMO, { error: "La conversación es demasiado larga" })
    // Qué es una conversación válida es parte del esquema y no una guarda
    // suelta en el handler: el último turno tiene que ser una pregunta con
    // texto adentro. Sin esto entra una conversación que termina en la
    // respuesta anterior, o un mensaje cuyas partes no traen ni una letra.
    //
    // Los dos toleran el arreglo vacío porque **Zod 4 corre todos los refine
    // aunque el .min(1) de arriba ya haya fallado**: dar por sentado que hay un
    // último mensaje tira un TypeError acá adentro, y un cuerpo inválido pasa
    // de ser un 400 a ser un 500.
    .refine((mensajes) => mensajes.length === 0 || mensajes.at(-1)?.role === "user", {
      error: "La conversación tiene que terminar en una pregunta del visitante",
    })
    .refine(
      (mensajes) => {
        const ultimo = mensajes.at(-1);
        return !ultimo || textoDe(ultimo).length > 0;
      },
      { error: "La pregunta viene vacía" },
    ),
});

/**
 * El 400.
 *
 * Se queda con el primer error y no con la lista entera: el cliente legítimo es
 * el front del sitio, que manda bien el cuerpo o no lo manda, y devolver el
 * árbol de issues de Zod es contarle a un desconocido la forma exacta del
 * esquema.
 */
const alFallar: ErrorRequestHandler = (errores, _req, res) => {
  const primero = errores[0]?.errors.issues[0]?.message;
  res.status(400).json({ error: primero ?? "El cuerpo no tiene la forma de una conversación" });
};

export function crearChatRouter() {
  const router = Router();

  router.post(
    "/chat",
    // Treinta preguntas cada cinco minutos: de sobra para probar el chat en
    // serio y lejos de agotar la cuota gratuita de Gemini. Va antes de validar
    // a propósito: si contara después, mandar basura sería gratis e ilimitado.
    limitarPorIp({ maximo: 30, ventanaMs: 5 * 60 * 1000 }),
    validate({ body: cuerpo, handler: alFallar }),
    async (req, res) => {
      // De cada mensaje sobrevive el texto y nada más. Las partes de tool de
      // los turnos anteriores no se reenvían al modelo: ya hicieron su trabajo,
      // y mandarlas de vuelta es contexto pago que no cambia la respuesta.
      const mensajes: ModelMessage[] = req.body.messages
        .slice(-CONTEXTO_MAXIMO)
        .map((m) => ({ role: m.role, content: textoDe(m) }))
        .filter((m) => m.content.length > 0);

      const idioma = req.body.idioma ?? "es";
      const marca = performance.now();

      // Todo lo que pase adentro —las tools, el fallback de modelo— hereda este
      // id y queda atado a esta pregunta en el log.
      await conRastro(nuevoRastro(), async () => {
        registro.info({
          evento: "chat.entra",
          idioma,
          turnos: mensajes.length,
          largoPregunta: mensajes.at(-1)?.content.length ?? 0,
        });

        const resultado = responder(mensajes, idioma);

        await pipeUIMessageStreamToResponse({
          response: res,
          // Las partes de tool viajan al front a propósito: abajo de cada
          // respuesta se muestra qué consultó, y esa es la mitad visible del
          // ruteo.
          stream: toUIMessageStream({
            stream: resultado.stream,
            onError: (error) => {
              registro.error({
                evento: "chat.stream",
                ms: desde(marca),
                error: error instanceof Error ? error.message : String(error),
              });
              return "Se me cortó la respuesta. Probá de nuevo.";
            },
          }),
        });

        // Después de que el stream terminó: acá `toolCalls` y `usage` ya están
        // resueltos. Es la línea que cierra la pregunta y la que dice, de una
        // sola mirada, si el ruteo fue el correcto y qué costó.
        //
        // Va con catch propio porque el visitante ya tiene su respuesta: que
        // falle una promesa del SDK al leer las métricas no puede convertirse
        // en un 500 sobre una respuesta que salió bien.
        try {
          const [llamadas, uso, motivo, texto] = await Promise.all([
            resultado.toolCalls,
            resultado.usage,
            resultado.finishReason,
            resultado.text,
          ]);

          // Una respuesta vacía es un fallo aunque el stream haya terminado
          // bien, y no deja ninguna otra huella: el visitante ve una burbuja en
          // blanco y los logs, un 200. Pasa cuando el modelo gasta todos los
          // pasos llamando tools y se queda sin turno para escribir — medido, 1
          // de cada 5 veces con una pregunta que cruza sabor y stock.
          //
          // Se registra como warn con el motivo del SDK: `tool-calls` significa
          // que cortó el techo de pasos, no que terminó.
          const nivel = texto.trim().length === 0 ? registro.warn : registro.info;
          nivel({
            evento: "chat.sale",
            ms: desde(marca),
            tools: [...new Set(llamadas.map((l) => l.toolName))],
            pasos: llamadas.length,
            motivo,
            vacia: texto.trim().length === 0,
            tokens: uso.totalTokens,
          });
        } catch (error) {
          registro.warn({
            evento: "chat.sale",
            ms: desde(marca),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    },
  );

  return router;
}
