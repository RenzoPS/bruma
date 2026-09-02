"use client";

import Image from "next/image";
import { useBrumita } from "@/lib/brumita";
import { useT } from "@/lib/i18n";
import { Revelar } from "./Revelar";

/**
 * La estacion de Brumita en el recorrido.
 *
 * No es un segundo chat: es la puerta. Las preguntas sugeridas y el campo abren
 * el panel y mandan ahi, contra la misma conversacion que guarda la burbuja. Un
 * hilo de charla partido en dos lugares de la pagina es la clase de detalle que
 * hace que un sitio se sienta armado con partes sueltas.
 *
 * Las preguntas sugeridas siguen visibles porque comunican de que es capaz sin
 * que haya que probarla, que es lo que hacian cuando el backend no existia.
 * Ahora ademas funcionan.
 */
export function Brumita() {
  const t = useT();
  const { abrir } = useBrumita();

  return (
    <section
      id="brumita"
      aria-labelledby="brumita-titulo"
      className="border-t border-linea py-estacion"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <Revelar>
            <div className="relative aspect-4/3 w-full overflow-hidden">
              <Image
                src="/estaciones/barra.jpg"
                alt={t.brumita.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </Revelar>

          <Revelar demora={0.1}>
            <p className="t-etiqueta text-tinta-suave">{t.brumita.etiqueta}</p>
            <h2
              id="brumita-titulo"
              className="t-display mt-3 max-w-[13ch] text-[clamp(2rem,5vw,3.75rem)] text-balance"
            >
              {t.brumita.titulo}
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-tinta-suave">
              {t.brumita.texto}
            </p>

            {/* Cada pregunta es un boton que arranca la charla con ella puesta:
                el visitante no tiene que redactar nada para probarla. */}
            <ul
              className="mt-8 flex flex-col gap-2 border-t pt-6"
              style={{ borderColor: "var(--etapa)" }}
            >
              {t.brumita.preguntas.map((pregunta) => (
                <li key={pregunta}>
                  <button
                    type="button"
                    onClick={() => abrir(pregunta)}
                    className="group flex w-full gap-3 text-left leading-relaxed"
                  >
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: "var(--etapa)" }}
                    >
                      —
                    </span>
                    <span className="text-tinta-suave underline decoration-linea decoration-1 underline-offset-4 transition-colors duration-200 group-hover:text-tinta group-hover:decoration-[var(--etapa)]">
                      {pregunta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => abrir()}
              className="t-etiqueta mt-8 bg-tinta px-9 py-[18px] text-paper transition-colors duration-300 hover:bg-[var(--etapa)]"
            >
              {t.brumita.abrir}
            </button>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
