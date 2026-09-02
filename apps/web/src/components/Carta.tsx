"use client";

import Image from "next/image";
import { CARTA, CATEGORIAS, precio } from "@/lib/carta";
import { useIdioma } from "@/lib/i18n";
import { Revelar } from "./Revelar";

/**
 * La carta, en grilla de fichas con foto.
 *
 * Una lista de nombres y precios le sirve al que ya sabe lo que quiere; el que
 * entra a decidir necesita ver la comida. Cada item trae su foto, su precio y
 * una linea de descripcion, que es exactamente lo que alguien mira antes de
 * pedir: como se ve y cuanto sale.
 */
export function Carta() {
  const { idioma, t } = useIdioma();
  const promo = CARTA.find((p) => p.clave === "promo");

  return (
    <section id="carta" aria-labelledby="carta-titulo" className="py-estacion">
      <h2 id="carta-titulo" className="sr-only">
        {t.nav.cafeteria}
      </h2>

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        {promo ? (
          <Revelar>
            <div
              className="flex flex-col justify-between gap-6 border p-8 sm:flex-row sm:items-end lg:p-10"
              style={{ borderColor: "var(--etapa)" }}
            >
              <div>
                <p className="t-etiqueta" style={{ color: "var(--etapa)" }}>
                  {t.cafeteria.promoEtiqueta}
                </p>
                <p className="t-display mt-3 text-[clamp(1.75rem,4vw,3rem)]">
                  {t.carta.productos.promo.nombre}
                </p>
                <p className="mt-2 max-w-[40ch] text-tinta-suave">{t.cafeteria.promoTexto}</p>
              </div>
              <p className="t-dato shrink-0 text-[clamp(2.25rem,5vw,3.5rem)] leading-none">
                {precio(promo.precio, idioma)}
              </p>
            </div>
          </Revelar>
        ) : null}

        {CATEGORIAS.filter((c) => c !== "grano").map((categoria) => {
          const items = CARTA.filter((p) => p.categoria === categoria && p.clave !== "promo");
          const cat = t.carta.categorias[categoria];

          return (
            <div key={categoria} className="mt-20 lg:mt-28">
              <Revelar>
                <div
                  className="flex items-baseline justify-between gap-6 border-b pb-4"
                  style={{ borderColor: "var(--etapa)" }}
                >
                  <h3 className="t-display text-[clamp(1.875rem,4vw,3rem)]">{cat.titulo}</h3>
                  <p className="t-etiqueta text-right text-tinta-suave">{cat.nota}</p>
                </div>
              </Revelar>

              <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, i) => {
                  const texto = t.carta.productos[item.clave];
                  return (
                    <Revelar key={item.clave} demora={(i % 3) * 0.06}>
                      <li className={item.disponible ? undefined : "opacity-50"}>
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-paper-deep">
                          <Image
                            src={item.imagen}
                            alt={texto.nombre}
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                            className="object-cover"
                          />
                          {item.disponible ? null : (
                            <span className="t-etiqueta absolute left-3 top-3 bg-paper px-2.5 py-1.5 text-tinta">
                              {t.cafeteria.agotado}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-linea pb-3">
                          <p className="t-titulo text-[clamp(1.125rem,1.8vw,1.375rem)]">
                            {texto.nombre}
                          </p>
                          <p className="t-dato shrink-0 text-lg">{precio(item.precio, idioma)}</p>
                        </div>

                        <p className="mt-2.5 text-sm leading-snug text-tinta-suave">{texto.desc}</p>
                      </li>
                    </Revelar>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
