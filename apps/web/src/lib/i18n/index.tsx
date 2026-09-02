"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
 * Estado de idioma para toda la app.
 *
 * Sin rutas por locale: el sitio tiene tres paginas y meterle /es y /en
 * duplicaria las URLs y el sitemap para traducir una landing. El idioma vive en
 * el cliente y se recuerda en localStorage.
 *
 * El primer render siempre es en espanol, igual que el HTML del servidor: leer
 * localStorage antes de montar daria un desajuste de hidratacion.
 */
export function ProveedorIdioma({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>("es");

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE);
    if (guardado === "en" || guardado === "es") setIdioma(guardado);
  }, []);

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
    setIdioma((actual) => {
      const siguiente = actual === "es" ? "en" : "es";
      try {
        window.localStorage.setItem(CLAVE, siguiente);
      } catch {
        // Modo privado o storage bloqueado: el idioma vale para esta visita.
      }
      return siguiente;
    });
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
