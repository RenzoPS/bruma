"use client";

import { useT } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { Revelar } from "./Revelar";

/**
 * El puente de la home a las otras dos paginas.
 *
 * Va despues del recorrido del proceso y antes de Brumita: para cuando el
 * visitante llega hasta aca ya vio el lugar y entendio por que el cafe es
 * distinto, que es exactamente el momento en que quiere saber que hay y cuanto
 * sale.
 */
export function Catalogo() {
  const t = useT();

  return (
    <section
      aria-labelledby="catalogo-titulo"
      className="border-t border-linea py-estacion"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <Revelar>
          <h2
            id="catalogo-titulo"
            className="t-display max-w-[18ch] text-[clamp(2rem,5vw,3.75rem)] text-balance"
          >
            {t.catalogo.titulo}
          </h2>
        </Revelar>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-10">
          <Revelar>
            <Link href="/cafeteria" className="group block">
              <div className="relative aspect-4/3 w-full overflow-hidden">
                <Image
                  src="/estaciones/mesa.jpg"
                  alt={t.catalogo.altMesa}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-6 border-t pt-4" style={{ borderColor: "var(--etapa)" }}>
                <p className="t-titulo text-[clamp(1.5rem,2.6vw,2.125rem)]">{t.catalogo.laCarta}</p>
                <p className="t-etiqueta text-tinta-suave">{t.catalogo.laCartaNota}</p>
              </div>
            </Link>
          </Revelar>

          <Revelar demora={0.1}>
            <Link href="/granos" className="group block">
              <div className="relative aspect-4/3 w-full overflow-hidden">
                <Image
                  src="/estaciones/bolsa.jpg"
                  alt={t.catalogo.altBolsa}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-6 border-t pt-4" style={{ borderColor: "var(--etapa)" }}>
                <p className="t-titulo text-[clamp(1.5rem,2.6vw,2.125rem)]">{t.catalogo.losGranos}</p>
                <p className="t-etiqueta text-tinta-suave">{t.catalogo.losGranosNota}</p>
              </div>
            </Link>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
