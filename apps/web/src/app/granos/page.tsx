"use client";

import Image from "next/image";
import { CARTA, precio, type ClaveProducto } from "@/lib/carta";
import { useIdioma } from "@/lib/i18n";
import { Revelar } from "@/components/Revelar";

type ClaveGrano = "guji" | "huila" | "cerrado" | "narino";

/**
 * Lo medible de cada origen: numeros, foto y color de etapa. Las notas de cata,
 * el metodo y para quien es viven en el diccionario, porque son texto.
 *
 * Estas fichas son las que despues van a la tabla `granos` y las que Brumita
 * indexa: lo que se muestra aca es lo mismo que va a leer el retrieval.
 */
const DATOS: Record<ClaveGrano, {
  altura: string;
  cuerpo: number;
  acidez: number;
  dulzor: number;
  imagen: string;
  etapa: string;
}> = {
  guji: { altura: "2.050 msnm", cuerpo: 2, acidez: 5, dulzor: 3, imagen: "/estaciones/verde.jpg", etapa: "var(--color-verde)" },
  huila: { altura: "1.750 msnm", cuerpo: 3, acidez: 3, dulzor: 4, imagen: "/estaciones/molino.jpg", etapa: "var(--color-amarillo)" },
  cerrado: { altura: "1.150 msnm", cuerpo: 5, acidez: 1, dulzor: 4, imagen: "/estaciones/granos-bol.jpg", etapa: "var(--color-tostado)" },
  narino: { altura: "2.100 msnm", cuerpo: 4, acidez: 3, dulzor: 5, imagen: "/estaciones/tueste-b.jpg", etapa: "var(--color-canela)" },
};

const esGrano = (c: ClaveProducto): c is ClaveGrano => c in DATOS;

/** Escala de cinco puntos. Un dato de cata se muestra, no se describe. */
function Escala({
  valor,
  etiqueta,
  color,
  sufijo,
}: {
  valor: number;
  etiqueta: string;
  color: string;
  sufijo: string;
}) {
  return (
    <div>
      <p className="t-etiqueta text-tinta-suave">{etiqueta}</p>
      <div className="mt-2 flex gap-1" role="img" aria-label={`${etiqueta}: ${valor} ${sufijo}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-1.5 w-6"
            style={{ backgroundColor: i <= valor ? color : "var(--color-linea)" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Granos() {
  const { idioma, t } = useIdioma();
  const granos = CARTA.filter((p) => p.categoria === "grano");

  return (
    <main className="flex-1">
      <section className="relative flex h-[62svh] items-end overflow-hidden">
        <Image
          src="/estaciones/bolsa.jpg"
          alt={t.granosPagina.alt}
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="w-full px-6 pb-10 lg:px-12 lg:pb-14">
          <div className="mx-auto w-full max-w-6xl">
            <p className="t-etiqueta text-tinta">{t.granosPagina.etiqueta}</p>
            <h1 className="t-display mt-3 max-w-[16ch] text-[clamp(2.5rem,6.5vw,5rem)] text-balance text-tinta">
              {t.granosPagina.titulo}
            </h1>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <Revelar>
          <p className="mt-12 max-w-[56ch] text-lg leading-relaxed text-tinta-suave lg:mt-16">
            {t.granosPagina.texto}
          </p>
        </Revelar>

        <div className="mt-16 flex flex-col gap-16 pb-estacion lg:mt-24 lg:gap-24">
          {granos.map((grano, i) => {
            if (!esGrano(grano.clave)) return null;
            const d = DATOS[grano.clave];
            const ficha = t.fichas[grano.clave];
            const nombre = t.carta.productos[grano.clave];
            const invertido = i % 2 === 1;

            return (
              <Revelar key={grano.clave}>
                <article className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
                  <div className={invertido ? "lg:order-2" : undefined}>
                    <div className="relative aspect-4/3 w-full overflow-hidden lg:aspect-square">
                      <Image
                        src={d.imagen}
                        alt={nombre.nombre}
                        fill
                        sizes="(min-width: 1024px) 42vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className={invertido ? "lg:order-1" : undefined}>
                    <div className="flex items-baseline justify-between gap-6">
                      <p className="t-etiqueta" style={{ color: d.etapa }}>
                        {ficha.proceso} · {d.altura}
                      </p>
                      {grano.disponible ? null : (
                        <p className="t-etiqueta text-tinta-suave">{t.granosPagina.agotado}</p>
                      )}
                    </div>

                    <h2 className="t-display mt-3 text-[clamp(1.875rem,4vw,3rem)]">
                      {nombre.nombre}
                    </h2>

                    <ul className="mt-5 flex flex-wrap gap-2">
                      {ficha.notas.map((nota) => (
                        <li
                          key={nota}
                          className="t-etiqueta border px-3 py-1.5 text-tinta-suave"
                          style={{ borderColor: d.etapa }}
                        >
                          {nota}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 grid grid-cols-3 gap-5 border-t border-linea pt-6">
                      <Escala valor={d.cuerpo} etiqueta={t.granosPagina.cuerpo} color={d.etapa} sufijo={t.granosPagina.deCinco} />
                      <Escala valor={d.acidez} etiqueta={t.granosPagina.acidez} color={d.etapa} sufijo={t.granosPagina.deCinco} />
                      <Escala valor={d.dulzor} etiqueta={t.granosPagina.dulzor} color={d.etapa} sufijo={t.granosPagina.deCinco} />
                    </div>

                    <dl className="mt-8 grid gap-4 border-t border-linea pt-6 sm:grid-cols-2">
                      <div>
                        <dt className="t-etiqueta text-tinta-suave">{t.granosPagina.leRinde}</dt>
                        <dd className="mt-1.5">{ficha.metodo}</dd>
                      </div>
                      <div>
                        <dt className="t-etiqueta text-tinta-suave">{t.granosPagina.esPara}</dt>
                        <dd className="mt-1.5 text-balance">{ficha.para}</dd>
                      </div>
                    </dl>

                    <p className="t-dato mt-8 text-[clamp(1.75rem,3vw,2.5rem)]">
                      {precio(grano.precio, idioma)}
                      <span className="t-etiqueta ml-3 align-middle text-tinta-suave">
                        {t.granosPagina.gramos}
                      </span>
                    </p>
                  </div>
                </article>
              </Revelar>
            );
          })}
        </div>
      </div>
    </main>
  );
}
