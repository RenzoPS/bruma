"use client";

import { useT } from "@/lib/i18n";
import Image from "next/image";
import { Revelar } from "./Revelar";

/**
 * Va inmediatamente despues del hero, y antes del proceso, a proposito.
 *
 * Tostar en el local es lo que hace distinto al cafe, pero no es el motivo por
 * el que alguien entra a una cafeteria: se entra porque se esta bien. Si el
 * proceso viene primero, la pagina argumenta como una tostaduria con mesas.
 *
 * El copy dice hechos y no adjetivos, igual que el resto: "doce mesas" y "nadie
 * te apura" prueban que el lugar es acogedor sin usar la palabra acogedor, que
 * es lo que escribe toda la categoria.
 */
export function ElLugar() {
  const t = useT();

  return (
    <section
      id="lugar"
      aria-labelledby="lugar-titulo"
      className="border-t border-linea py-estacion"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <Revelar>
          <p className="t-etiqueta text-tinta-suave">{t.lugar.etiqueta}</p>
        </Revelar>

        <Revelar demora={0.08}>
          <h2
            id="lugar-titulo"
            className="t-display mt-4 max-w-[14ch] text-[clamp(2.25rem,6vw,4.5rem)] text-balance"
          >
            {t.lugar.titulo}
          </h2>
        </Revelar>

        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-tinta-suave">
{t.lugar.texto}
        </p>
      </div>

      <div className="mx-auto mt-12 w-full max-w-6xl px-6 lg:mt-16 lg:px-12">
        <div className="relative aspect-3/4 w-full sm:aspect-4/3 lg:aspect-16/10">
          <Image
            src="/estaciones/salon.jpg"
            alt={t.lugar.altSalon}
            fill
            sizes="(min-width: 1024px) 1152px, 100vw"
            className="object-cover object-center"
          />
        </div>
      </div>

      <div className="mx-auto mt-12 w-full max-w-6xl px-6 lg:mt-16 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div className="relative aspect-3/4 w-full">
            <Image
              src="/estaciones/mesa.jpg"
              alt={t.lugar.altMesa}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <h3 className="t-titulo max-w-[18ch] text-[clamp(1.875rem,3.4vw,2.75rem)] text-balance">
              {t.lugar.acompanarTitulo}
            </h3>

            <p className="mt-5 max-w-[44ch] leading-relaxed text-tinta-suave">
{t.lugar.acompanarTexto}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t pt-6" style={{ borderColor: "var(--etapa)" }}>
              <div>
                <dt className="t-etiqueta text-tinta-suave">{t.lugar.abrimos}</dt>
                <dd className="t-dato mt-2 text-[clamp(1.25rem,2.2vw,1.625rem)]">7:30</dd>
              </div>
              <div>
                <dt className="t-etiqueta text-tinta-suave">{t.lugar.cerramos}</dt>
                <dd className="t-dato mt-2 text-[clamp(1.25rem,2.2vw,1.625rem)]">20:00</dd>
              </div>
              <div>
                <dt className="t-etiqueta text-tinta-suave">{t.lugar.mesas}</dt>
                <dd className="t-dato mt-2 text-[clamp(1.25rem,2.2vw,1.625rem)]">12</dd>
              </div>
              <div>
                <dt className="t-etiqueta text-tinta-suave">{t.lugar.wifi}</dt>
                <dd className="t-dato mt-2 text-[clamp(1.25rem,2.2vw,1.625rem)]">{t.lugar.wifiSi}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
