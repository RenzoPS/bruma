"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdioma } from "@/lib/i18n";

/**
 * Barra fija.
 *
 * Arranca transparente sobre el hero —que es una foto y no necesita una banda
 * encima— y adopta fondo solido con su filete apenas el visitante scrollea. Ese
 * cambio no es decorativo: sin fondo, los links se pierden sobre el contenido
 * de abajo; con fondo desde el arranque, se le come el primer plano a la foto.
 */
export function Navbar() {
  const [scrolleado, setScrolleado] = useState(false);
  const ruta = usePathname();
  const { idioma, t, alternar } = useIdioma();

  const secciones = [
    { href: "/", nombre: t.nav.inicio },
    { href: "/cafeteria", nombre: t.nav.cafeteria },
    { href: "/granos", nombre: t.nav.granos },
  ];

  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > 24);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolleado
          ? "border-b border-linea bg-paper/95 backdrop-blur-sm"
          : "border-b border-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-12">
        <Link href="/" aria-label={t.nav.inicioAria}>
          <Image
            src="/logo.png"
            alt="BRUMA"
            width={1144}
            height={400}
            priority
            className="h-7 w-auto lg:h-8"
          />
        </Link>

        <div className="flex items-center gap-5 lg:gap-10">
          <ul className="flex items-center gap-5 lg:gap-10">
            {secciones.map((seccion) => {
              const activa =
                seccion.href === "/" ? ruta === "/" : ruta.startsWith(seccion.href);
              return (
                <li key={seccion.href}>
                  <Link
                    href={seccion.href}
                    aria-current={activa ? "page" : undefined}
                    className="t-etiqueta relative py-1 text-tinta transition-opacity duration-200 hover:opacity-70"
                  >
                    {seccion.nombre}
                    {/* El filete de la seccion activa se pinta del color de la
                        etapa: la navegacion tambien se tuesta con el recorrido
                        en vez de quedar fuera del sistema. */}
                    <span
                      className="absolute inset-x-0 -bottom-0.5 h-px origin-left transition-transform duration-300"
                      style={{
                        backgroundColor: "var(--etapa)",
                        transform: `scaleX(${activa ? 1 : 0})`,
                      }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Muestra el idioma al que se cambia, no el actual: un boton dice lo
              que hace al tocarlo, no dónde estás parado. */}
          <button
            type="button"
            onClick={alternar}
            aria-label={t.nav.idioma}
            className="t-etiqueta border border-linea px-2.5 py-1.5 text-tinta transition-colors duration-200 hover:border-[var(--etapa)] hover:text-[var(--etapa)]"
          >
            {idioma === "es" ? "EN" : "ES"}
          </button>
        </div>
      </div>
    </nav>
  );
}
