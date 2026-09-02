"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Estacion as EstacionData } from "@/lib/estaciones";
import { useT } from "@/lib/i18n";
import { Contador } from "./Contador";
import { Revelar } from "./Revelar";

const COLOR_ETAPA: Record<EstacionData["etapa"], string> = {
  verde: "var(--color-verde)",
  amarillo: "var(--color-amarillo)",
  canela: "var(--color-canela)",
  tostado: "var(--color-tostado)",
  oscuro: "var(--color-oscuro)",
};

type Props = { estacion: EstacionData; indice: number };

/**
 * La unidad del recorrido. Ocupa el viewport y, al entrar, reescribe --etapa en
 * el root: de ahi dependen el color de los botones, los filetes y los acentos.
 *
 * El color lo cambia un IntersectionObserver y no una animacion por scroll:
 * cuesta casi nada, no corre en cada frame, y degrada a un color fijo si el
 * observer no existe.
 */
export function Estacion({ estacion, indice }: Props) {
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  const textos = t.estaciones[estacion.id];

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        document.documentElement.style.setProperty("--etapa", COLOR_ETAPA[estacion.etapa]);
      },
      // Se dispara cuando la estacion ocupa la banda central de la pantalla, no
      // al asomar: el color acompana lo que se esta leyendo.
      { rootMargin: "-45% 0px -45% 0px" },
    );

    observer.observe(nodo);
    return () => observer.disconnect();
  }, [estacion.etapa]);

  const impar = indice % 2 === 1;

  return (
    <section
      ref={ref}
      id={estacion.id}
      aria-labelledby={`${estacion.id}-titulo`}
      className="grid min-h-svh items-center gap-8 py-estacion lg:grid-cols-2 lg:gap-16"
    >
      <div className={impar ? "lg:order-2" : undefined}>
        <p className="t-etiqueta text-tinta-suave">{textos.momento}</p>

        <Revelar className="mt-4">
          <h2
            id={`${estacion.id}-titulo`}
            className="t-titulo max-w-[16ch] text-[clamp(1.875rem,4vw,3.25rem)] text-balance"
          >
            {textos.titulo}
          </h2>
        </Revelar>

        <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-tinta-suave">
          {textos.texto}
        </p>

        <div className="mt-10 border-t pt-5" style={{ borderColor: "var(--etapa)" }}>
          <p className="t-dato text-[clamp(2rem,5vw,3.25rem)]">
            <Contador valor={estacion.dato.valor} />
            {estacion.dato.unidad ? (
              <span className="t-etiqueta ml-2 align-baseline text-tinta-suave">
                {estacion.dato.unidad}
              </span>
            ) : null}
          </p>
          <p className="t-etiqueta mt-3 text-tinta-suave">{textos.datoLabel}</p>
        </div>
      </div>

      <figure className={impar ? "lg:order-1" : undefined}>
        <Revelar className="relative aspect-4/5 w-full overflow-hidden bg-paper-deep">
          <Image
            src={estacion.imagen}
            alt={textos.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
            priority={indice === 0}
          />
        </Revelar>
      </figure>
    </section>
  );
}
