"use client";

import { useT } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";

/**
 * Pie de todas las paginas.
 *
 * Compacto a proposito: un pie es donde alguien busca la direccion, el horario
 * y poco mas. La declaracion de ficcion va abajo del todo, en letra chica, que
 * es donde vive una nota legal — arriba competia con la informacion util y
 * hacia que el pie ocupara media pantalla.
 */
export function Footer() {
  const t = useT();
  const secciones = [
    { href: "/", nombre: t.nav.inicio },
    { href: "/cafeteria", nombre: t.nav.cafeteria },
    { href: "/granos", nombre: t.nav.granos },
  ];
  const [calle, barrio] = t.cierre.direccion.split("\n");

  return (
    <footer className="mt-auto border-t border-linea bg-paper-deep">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo.png"
              alt="BRUMA"
              width={1144}
              height={400}
              className="h-7 w-auto"
            />
            <p className="mt-4 max-w-[24ch] text-sm leading-relaxed text-tinta-suave">
              {t.footer.descripcion}
            </p>
          </div>

          <div>
            <p className="t-etiqueta text-tinta-suave">{t.footer.donde}</p>
            <p className="mt-3 leading-relaxed">
{calle}
              <br />
              {barrio}
            </p>
          </div>

          <div>
            <p className="t-etiqueta text-tinta-suave">{t.footer.horarios}</p>
            <dl className="mt-3 space-y-1 text-sm leading-relaxed">
              <div className="flex justify-between gap-4">
                <dt className="text-tinta-suave">{t.footer.lunVie}</dt>
                <dd className="t-dato">7:30 – 20:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-tinta-suave">{t.footer.sabados}</dt>
                <dd className="t-dato">8:30 – 20:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-tinta-suave">{t.footer.domingos}</dt>
                <dd className="t-dato">9:00 – 14:00</dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="t-etiqueta text-tinta-suave">{t.footer.secciones}</p>
            <ul className="mt-3 space-y-2">
              {secciones.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="transition-colors duration-200 hover:text-[var(--etapa)]"
                  >
                    {s.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-linea pt-6 text-xs leading-relaxed text-tinta-suave">
          <span className="t-etiqueta text-tinta">{t.footer.fiscalTitulo}</span>{" "}
{t.footer.fiscal}
        </p>
      </div>
    </footer>
  );
}
