"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  etiqueta: string;
  titulo: string;
  texto: string;
  children?: ReactNode;
};

/**
 * La pantalla de una sola cosa: el 404 y el error.
 *
 * Las dos dicen lo mismo con distinto texto, así que comparten la composición —
 * rótulo narrow en caps, titular serif, una línea de explicación y las acciones
 * abajo de un filete. Es la gramática de las estaciones del recorrido, sin la
 * foto: acá no hay nada que mostrar.
 *
 * `min-h` y no `h`: el pie va abajo del todo por el `mt-auto` del layout, y una
 * altura fija dejaría el aviso centrado en la pantalla con el pie encima.
 */
export function Aviso({ etiqueta, titulo, texto, children }: Props) {
  return (
    <main className="flex min-h-[70vh] items-center px-6 py-24 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <p className="t-etiqueta text-tinta-suave">{etiqueta}</p>
        <h1 className="t-titulo mt-6 max-w-[18ch]">{titulo}</h1>
        <p className="mt-6 max-w-[46ch] leading-relaxed text-tinta-suave">{texto}</p>
        <div className="mt-10 flex flex-wrap gap-4 border-t border-linea pt-8">{children}</div>
      </div>
    </main>
  );
}

/** El mismo botón rectangular con filete que usa el resto del sitio. */
export function AccionAviso({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  const clases =
    "t-etiqueta border border-tinta px-6 py-4 text-tinta transition-colors duration-300 hover:border-[var(--etapa)] hover:text-[var(--etapa)]";

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={clases}>
      {children}
    </button>
  );
}
