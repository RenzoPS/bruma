"use client";

import { useT } from "@/lib/i18n";
import Image from "next/image";
import { Revelar } from "./Revelar";

/**
 * Cierra la home con lo que trajo a la persona: donde queda y a que hora abre.
 * La declaracion de ficcion no va aca sino en el pie, que es donde vive una
 * nota legal y donde no compite con el dato practico.
 */
export function Cierre() {
  const t = useT();
  const horarios = [
    { dia: t.cierre.horarios.semana, horas: "7:30 – 20:00" },
    { dia: t.cierre.horarios.sabados, horas: "8:30 – 20:00" },
    { dia: t.cierre.horarios.domingos, horas: "9:00 – 14:00" },
  ];
  const [calle, barrio] = t.cierre.direccion.split("\n");

  return (
    <section
      id="donde"
      aria-labelledby="donde-titulo"
      className="border-t border-linea py-estacion"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <Revelar>
          <p className="t-etiqueta text-tinta-suave">{t.cierre.etiqueta}</p>
          <h2
            id="donde-titulo"
            className="t-display mt-3 max-w-[14ch] text-[clamp(2rem,5vw,3.75rem)] text-balance"
          >
            {t.cierre.titulo}
          </h2>
        </Revelar>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
          <Revelar>
            <div className="relative aspect-16/10 w-full overflow-hidden">
              <Image
                src="/estaciones/fachada.jpg"
                alt={t.cierre.alt}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          </Revelar>

          <Revelar demora={0.1}>
            <p className="t-etiqueta text-tinta-suave">{t.cierre.direccionLabel}</p>
            <p className="t-titulo mt-3 text-[clamp(1.75rem,3vw,2.5rem)]">
{calle}
              <br />
              {barrio}
            </p>

            <dl className="mt-8 border-t pt-5" style={{ borderColor: "var(--etapa)" }}>
              {horarios.map((h) => (
                <div
                  key={h.dia}
                  className="flex items-baseline justify-between gap-6 border-b border-linea py-3"
                >
                  <dt className="text-tinta-suave">{h.dia}</dt>
                  <dd className="t-dato">{h.horas}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-7 max-w-[38ch] leading-relaxed text-tinta-suave">
{t.cierre.nota}
            </p>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
