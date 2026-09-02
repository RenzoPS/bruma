"use client";

import Image from "next/image";
import { Carta } from "@/components/Carta";
import { Revelar } from "@/components/Revelar";
import { useT } from "@/lib/i18n";

export default function Cafeteria() {
  const t = useT();

  return (
    <main className="flex-1">
      <section className="relative flex h-[62svh] items-end overflow-hidden">
        <Image
          src="/estaciones/salon-lleno.jpg"
          alt={t.cafeteria.alt}
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="w-full px-6 pb-10 lg:px-12 lg:pb-14">
          <div className="mx-auto w-full max-w-6xl">
            <p className="t-etiqueta text-tinta">{t.cafeteria.etiqueta}</p>
            <h1 className="t-display mt-3 max-w-[16ch] text-[clamp(2.5rem,6.5vw,5rem)] text-balance text-tinta">
              {t.cafeteria.titulo}
            </h1>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        <Revelar>
          <p className="mt-12 max-w-[56ch] text-lg leading-relaxed text-tinta-suave lg:mt-16">
            {t.cafeteria.texto}
          </p>
        </Revelar>
      </div>

      <Carta />
    </main>
  );
}
