"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { useIdioma } from "./i18n";

/**
 * El estado de la conversacion, uno solo para todo el sitio.
 *
 * La seccion del recorrido y la burbuja no son dos chats: son dos puertas a la
 * misma charla. Si cada una tuviera su useChat, alguien podria preguntar algo
 * abajo, abrir la burbuja y encontrarla vacia — o peor, mandar dos veces la
 * misma pregunta y pagarla dos veces.
 *
 * Por eso el hook vive aca arriba, en el layout, y no adentro de un componente.
 */

/**
 * Mismo origen que el sitio: del otro lado hay un route handler que proxea a la
 * API. El navegador nunca ve la URL de la api ni hace un preflight.
 */
const RUTA = "/api/brumita/chat";

type Contexto = {
  mensajes: UIMessage[];
  estado: "ready" | "submitted" | "streaming" | "error";
  error: Error | undefined;
  abierto: boolean;
  /** Abre el panel. Con texto, ademas manda la pregunta. */
  abrir: (pregunta?: string) => void;
  cerrar: () => void;
  preguntar: (texto: string) => void;
  detener: () => void;
  reintentar: () => void;
};

const ContextoBrumita = createContext<Contexto | null>(null);

export function ProveedorBrumita({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const { idioma } = useIdioma();

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: useMemo(() => new DefaultChatTransport({ api: RUTA }), []),
  });

  // El idioma en el que el visitante esta leyendo el sitio viaja con cada
  // pregunta, y del otro lado se convierte en una orden sin condicionales.
  //
  // Pedirle al modelo que dedujera el idioma no alcanzo, y esta medido: las
  // fichas estan en castellano y son lo mas reciente del contexto cuando
  // redacta, asi que le pesan mas que la instruccion — una pregunta en ingles
  // se contestaba en castellano. El front es el unico que sabe el idioma con
  // certeza, asi que la decision se toma aca. Ver `directivaDeIdioma` en la API.
  //
  // Va como `body` de la llamada y no en el transport: el transport se crea una
  // sola vez y su closure se quedaria con el idioma del primer render.
  const preguntar = useCallback(
    (texto: string) => {
      const limpio = texto.trim();
      if (!limpio) return;
      sendMessage({ role: "user", parts: [{ type: "text", text: limpio }] }, { body: { idioma } });
    },
    [sendMessage, idioma],
  );

  const abrir = useCallback(
    (pregunta?: string) => {
      setAbierto(true);
      if (pregunta) preguntar(pregunta);
    },
    [preguntar],
  );

  const valor = useMemo<Contexto>(
    () => ({
      mensajes: messages,
      estado: status,
      error,
      abierto,
      abrir,
      cerrar: () => setAbierto(false),
      preguntar,
      detener: stop,
      reintentar: () => regenerate({ body: { idioma } }),
    }),
    [messages, status, error, abierto, abrir, preguntar, stop, regenerate, idioma],
  );

  return <ContextoBrumita.Provider value={valor}>{children}</ContextoBrumita.Provider>;
}

export function useBrumita() {
  const contexto = useContext(ContextoBrumita);
  if (!contexto) throw new Error("useBrumita necesita estar adentro de <ProveedorBrumita>");
  return contexto;
}

/* ------------------------------------------------------------------------- */

/** Las cuatro tools que declara la API, en el orden en que suelen aparecer. */
export type Fuente = "buscarProductos" | "verGranos" | "buscarEnFichas" | "horariosYUbicacion";

type ChunkRecuperado = { granoNombre?: string };

/**
 * Lo que devuelve `buscarEnFichas`.
 *
 * Los chunks vienen adentro de `chunks` y no sueltos porque la tool manda
 * ademas un recordatorio de idioma al modelo — las fichas estan en castellano y
 * son lo mas reciente del contexto cuando redacta, asi que sin eso una pregunta
 * en ingles se contesta en castellano. Ver la nota en la tool.
 */
type SalidaFichas = { chunks?: ChunkRecuperado[] };

/**
 * De que se agarro Brumita para contestar.
 *
 * Sale de las partes de tool del propio mensaje: no hay un campo aparte que el
 * servidor tenga que mantener al dia, y por eso no puede mentir — si la fuente
 * aparece listada es porque esa tool se ejecutó de verdad.
 *
 * De `buscarEnFichas` ademas se sacan los granos, que es el dato que le sirve a
 * la persona: no "consulté las fichas" sino "esto sale de la ficha del Huila".
 */
export function fuentesDe(mensaje: UIMessage): { tool: Fuente; granos: string[] }[] {
  const encontradas = new Map<Fuente, Set<string>>();

  for (const parte of mensaje.parts) {
    if (!isToolUIPart(parte)) continue;

    const tool = getToolName(parte) as Fuente;
    const granos = encontradas.get(tool) ?? new Set<string>();

    if (tool === "buscarEnFichas" && parte.state === "output-available") {
      const salida = parte.output as SalidaFichas | undefined;
      for (const chunk of salida?.chunks ?? []) {
        if (chunk.granoNombre) granos.add(chunk.granoNombre);
      }
    }

    encontradas.set(tool, granos);
  }

  return [...encontradas].map(([tool, granos]) => ({ tool, granos: [...granos] }));
}

/**
 * Que esta consultando ahora mismo, mientras la respuesta todavia no llegó.
 *
 * Es la unica parte de la interfaz que muestra el mecanismo en vivo, y es medio
 * punto del proyecto: se ve que antes de contestar fue a buscar el dato.
 */
export function consultandoAhora(mensaje: UIMessage | undefined): Fuente | undefined {
  if (!mensaje) return undefined;

  for (const parte of [...mensaje.parts].reverse()) {
    if (!isToolUIPart(parte)) continue;
    if (parte.state === "input-streaming" || parte.state === "input-available") {
      return getToolName(parte) as Fuente;
    }
  }
  return undefined;
}

/** El texto de un mensaje, que es lo unico que se muestra en pantalla. */
export function textoDe(mensaje: UIMessage): string {
  return mensaje.parts
    .filter((parte) => parte.type === "text")
    .map((parte) => (parte as { text: string }).text)
    .join("");
}
