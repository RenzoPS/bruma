"use client";

/*
 * CONTRATO DE DIRECCIÓN — home de BRUMA
 *
 * THESIS: la página no cuenta que se trabaja a puertas abiertas, lo hace: el
 * scroll es el recorrido del grano por el local. Rechaza la landing de café de
 * especialidad de la categoría (fondo crema, serif de alto contraste, acento
 * terracota, tres tarjetas de origen) y también su opuesto de boutique, negro
 * con cobre, que es de donde viene este proyecto.
 *
 * OWN-WORLD: ground frío de papel técnico (#F2F3F0) constante, y como sistema
 * de acento las cinco etapas reales del tueste — verde crudo, amarillo, canela,
 * tostado, oscuro — que avanzan con el scroll. Archivo (Omnibus-Type, Buenos
 * Aires) en un solo archivo variable: expanded para display, narrow en caps
 * para los rótulos de instrumento. Sin radios, sin sombras, filetes de 1px.
 *
 * STORY: el visitante entiende que acá se tuesta, ve el proceso completo en
 * orden, y termina sabiendo dónde queda y qué va a encontrar. La bolsa aparece
 * al final, cuando el lugar ya gustó.
 *
 * FIRST VIEWPORT: el pour a sangre, corriendo con el scroll, y una lámina de
 * paper con su filete apoyada encima —columna a la derecha en escritorio,
 * banda abajo en pantalla angosta— con el rubro, el titular, el horario y las
 * dos acciones. Al scrollear la lámina se corre y queda la taza terminada
 * sola: la página se abre y se ve el trabajo, que es el posicionamiento.
 *
 * FORM: candidato 5 de la lista ordenada por resonancia (mesa de catación),
 * reencuadrado por el brief pinneado del usuario en "a puertas abiertas: el
 * recorrido del grano". Seed key 56bbaa09, scope direction, mode persuade.
 */

import { Hero } from "@/components/Hero";
import { ElLugar } from "@/components/ElLugar";
import { Catalogo } from "@/components/Catalogo";
import { Brumita } from "@/components/Brumita";
import { Cierre } from "@/components/Cierre";
import { Estacion } from "@/components/Estacion";
import { ESTACIONES } from "@/lib/estaciones";
import { useT } from "@/lib/i18n";

export default function Home() {
  const t = useT();

  return (
    <>
      <main className="flex-1">
        <Hero />
        <ElLugar />

        <div className="mx-auto w-full max-w-6xl px-6 pt-estacion lg:px-12">
          <div className="border-t border-linea pt-10">
            <p className="t-etiqueta text-tinta-suave">{t.recorrido.etiqueta}</p>
            <h2 className="t-display mt-4 max-w-[16ch] text-[clamp(2.25rem,6vw,4.5rem)] text-balance">
              {t.recorrido.titulo}
            </h2>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-tinta-suave">
{t.recorrido.texto}
            </p>
          </div>
          {ESTACIONES.map((estacion, i) => (
            <Estacion key={estacion.id} estacion={estacion} indice={i} />
          ))}
        </div>

        <Catalogo />
        <Brumita />
        <Cierre />
      </main>
    </>
  );
}
