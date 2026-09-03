"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { es, type Textos } from "./es";
import { en } from "./en";

export type Idioma = "es" | "en";

const DICCIONARIOS = { es, en } as const;
const CLAVE = "bruma:idioma";

type Contexto = {
  idioma: Idioma;
  t: Textos;
  alternar: () => void;
};

const IdiomaContext = createContext<Contexto | null>(null);

/**
 * El idioma elegido, como store externo de React.
 *
 * El idioma ES un estado externo: vive en localStorage, sobrevive a la recarga y
 * lo puede cambiar otra pestana. Por eso se lee con `useSyncExternalStore` y no
 * con un `useState` que un efecto corrige despues de montar. Esa era la version
 * anterior y el lint la marcaba (`react-hooks/set-state-in-effect`) por una
 * razon real, no por gusto: setState adentro de un efecto encadena un segundo
 * render **despues** de pintar, asi que quien recargaba con el sitio en ingles
 * veia un cuadro en castellano antes de que se corrigiera.
 *
 * `getServerSnapshot` devuelve "es", que es lo que el HTML del servidor trae. El
 * primer render del cliente coincide con el del servidor —no hay desajuste de
 * hidratacion— y React sincroniza en el mismo commit, sin cuadro intermedio.
 */
const esIdioma = (valor: unknown): valor is Idioma => valor === "es" || valor === "en";

/**
 * La verdad vive en esta variable, no en localStorage.
 *
 * Parece un rodeo y no lo es: si el store leyera localStorage en cada snapshot,
 * un navegador que lo bloquea —Safari en privado tira al escribir— dejaria el
 * selector sin efecto, porque `alternar` guardaria en un lugar que despues
 * devuelve siempre lo mismo. Con la variable en el medio, no poder persistir
 * degrada lo justo: el idioma cambia igual y se pierde al recargar.
 *
 * `undefined` significa "todavia no se leyo del storage", que no es lo mismo que
 * "no hay nada guardado": lo primero pasa una sola vez y lo segundo vale "es".
 */
let elegido: Idioma | undefined;

function leerIdioma(): Idioma {
  if (elegido === undefined) {
    try {
      const guardado = window.localStorage.getItem(CLAVE);
      elegido = esIdioma(guardado) ? guardado : "es";
    } catch {
      elegido = "es";
    }
  }
  return elegido;
}

const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((notificar) => notificar());

/** Otra pestana cambio el idioma: se descarta lo leido y se vuelve a mirar. */
function alCambiarElStorage(evento: StorageEvent) {
  if (evento.key !== null && evento.key !== CLAVE) return;
  elegido = undefined;
  avisar();
}

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar);
  window.addEventListener("storage", alCambiarElStorage);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener("storage", alCambiarElStorage);
  };
}

function elegirIdioma(siguiente: Idioma) {
  elegido = siguiente;
  try {
    window.localStorage.setItem(CLAVE, siguiente);
  } catch {
    // Storage bloqueado: el idioma vale para esta visita y no sobrevive a la
    // recarga. Es la degradacion correcta — mejor que el selector no responda.
  }
  avisar();
}

/**
 * Estado de idioma para toda la app.
 *
 * Sin rutas por locale: el sitio tiene tres paginas y meterle /es y /en
 * duplicaria las URLs y el sitemap para traducir una landing. El idioma vive en
 * el cliente y se recuerda en localStorage.
 */
export function ProveedorIdioma({ children }: { children: ReactNode }) {
  const idioma = useSyncExternalStore(suscribir, leerIdioma, () => "es" as const);

  const ruta = usePathname();

  // El <title> tambien es texto visible. Sin rutas por locale, Next lo renderiza
  // una sola vez desde el servidor, asi que se actualiza aca: si no, la pestana
  // se queda en espanol con la pagina en ingles.
  useEffect(() => {
    document.documentElement.lang = idioma === "es" ? "es-AR" : "en";
    const meta = DICCIONARIOS[idioma].meta;
    const porRuta = ruta.startsWith("/cafeteria")
      ? meta.cafeteria
      : ruta.startsWith("/granos")
        ? meta.granos
        : meta.home;
    document.title = porRuta.titulo;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", porRuta.desc);
  }, [idioma, ruta]);

  const alternar = useCallback(() => {
    elegirIdioma(leerIdioma() === "es" ? "en" : "es");
  }, []);

  return (
    <IdiomaContext.Provider value={{ idioma, t: DICCIONARIOS[idioma], alternar }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma necesita estar dentro de ProveedorIdioma");
  return ctx;
}

/** Atajo para el caso comun: solo leer textos. */
export function useT() {
  return useIdioma().t;
}
