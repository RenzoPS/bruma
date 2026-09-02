"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useT } from "@/lib/i18n";

/**
 * Primera vista: el pour corre con el scroll y la lamina se corre para dejarlo ver.
 *
 * La version anterior apoyaba el texto directo sobre la foto, con una excepcion
 * justificada a mano: se habia medido el contraste sobre esa imagen concreta.
 * Con video esa justificacion no existe — la luminancia cambia cuadro a cuadro
 * y ningun color de texto sirve para los 121 —, asi que se vuelve a la regla
 * del sistema: **el texto va sobre un bloque opaco de paper con su filete**.
 * Superposicion de imprenta, que es el unico recurso de profundidad que hay.
 *
 * De ahi sale el movimiento, que no es un efecto encima sino la misma idea a
 * escala: la lamina es una hoja apoyada sobre la foto, y al scrollear se corre.
 * La pagina se abre y se ve el trabajo, que es literalmente el posicionamiento
 * de BRUMA. El ultimo tramo del recorrido no tiene lamina ni texto: queda la
 * roseta terminada, sola, a sangre.
 *
 * Es el unico momento autorado de la pagina. Antes habia un segundo —el tueste
 * pineado, con su cronometro— y se saco: dos secciones que se clavan y scrubean
 * seguidas no son dos momentos, son la misma idea repetida, y la segunda le
 * gasta al visitante la paciencia que necesitaba la primera. El contenido del
 * tueste no se perdio: vive en la estacion 02 del recorrido, sobre fondo limpio
 * y con sus datos, que es donde se puede leer.
 *
 * El cierre: cuando la lamina termina de salir aparece la marca en el centro
 * del cuadro, sin banda ni recuadro. Ver la nota del bloque, mas abajo: es la
 * unica excepcion a "ningun texto sobre una foto" de todo el sitio, y esta
 * medida sobre el cuadro final concreto en vez de supuesta.
 */

/** Dos encodes, uno solo se descarga. Ver la nota de `src` mas abajo. */
const VIDEO_ANCHO = "/hero/pour-ancho.mp4";
const VIDEO_ALTO = "/hero/pour-alto.mp4";

const SIN_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

const suscribirAMovimiento = (avisar: () => void) => {
  const consulta = window.matchMedia(SIN_MOVIMIENTO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
};

const hayMovimiento = () => !window.matchMedia(SIN_MOVIMIENTO).matches;

/**
 * El mismo gesto que usa todo el sitio —subir y aparecer— con la curva del
 * scroll suave, para que el cierre frene igual que el resto. Un poco mas de
 * recorrido que los doce pixeles de Revelar porque esto es un titulo, no un
 * parrafo entrando.
 */
const ENTRADA_MARCA = {
  oculta: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero() {
  const t = useT();
  const contenedor = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lamina = useRef<HTMLDivElement>(null);
  // GSAP no anima la marca: solo avisa cuando el recorrido llego al punto en
  // que la lamina ya se fue. La entrada la hace Motion, con su propio tiempo,
  // asi que se lee como un titulo que aparece y no como algo pegado a la rueda
  // del mouse. El ref evita reescribir el estado en cada frame del scrub.
  const [marcaVisible, setMarcaVisible] = useState(false);
  const marcaEnPantalla = useRef(false);

  // El video se monta despues del primer render y solo si hay movimiento
  // permitido: para quien pidio reduced-motion no se bajan 972 kB de un clip
  // que no va a moverse nunca. Debajo queda el poster, que es el cuadro 0.
  //
  // Va por useSyncExternalStore y no por un efecto que llama a setState: el
  // valor del servidor es false, asi que el HTML sale sin video y sin salto en
  // la hidratacion, y ademas queda suscripto — si alguien cambia la preferencia
  // del sistema con la pagina abierta, el hero le hace caso.
  const animar = useSyncExternalStore(suscribirAMovimiento, hayMovimiento, () => false);
  const [listo, setListo] = useState(false);

  useLayoutEffect(() => {
    const v = video.current;
    const l = lamina.current;
    const c = contenedor.current;
    if (!animar || !v || !l || !c) return;

    gsap.registerPlugin(ScrollTrigger);

    // iOS no decodifica un video que nunca se reprodujo, asi que el primer seek
    // devuelve el poster y el scrub arranca muerto. Un play/pause en el primer
    // toque lo despierta sin que se vea nada.
    const despertar = () => {
      v.play().then(() => v.pause()).catch(() => {});
    };
    window.addEventListener("touchstart", despertar, { once: true, passive: true });

    const mm = gsap.matchMedia();
    let armado = false;

    const armar = () => {
      if (armado) return;
      armado = true;

      mm.add(
        { escritorio: "(min-width: 1024px)", movil: "(max-width: 1023px)" },
        (contexto) => {
          const { escritorio } = contexto.conditions as { escritorio: boolean };

          const linea = gsap.timeline({
            scrollTrigger: {
              trigger: c,
              start: "top top",
              end: "+=100%",
              pin: true,
              scrub: 0.5,
              invalidateOnRefresh: true,
              // 0.82 es apenas despues de que la lamina termina de salir (0.80).
              onUpdate: (self) => {
                const debe = self.progress > 0.82;
                if (debe === marcaEnPantalla.current) return;
                marcaEnPantalla.current = debe;
                setMarcaVisible(debe);
              },
            },
          });

          // Un tween vacio fija el largo del recorrido en 1. Todo lo demas se
          // ubica adentro como fraccion, asi que mover un tramo no recalcula
          // los otros.
          linea.to({}, { duration: 1 }, 0);

          // El pour termina al 85% del recorrido. El 15% que sobra es la pausa
          // sobre la roseta terminada: sin ella el ultimo cuadro se ve medio
          // segundo y el final del video no existe.
          const cabezal = { t: 0 };
          // Cada asignacion de currentTime dispara un seek. Pedir dos veces el
          // mismo cuadro es trabajo tirado, asi que se escribe solo cuando el
          // cabezal se movio mas de medio cuadro (el clip es de 24 fps).
          const MEDIO_CUADRO = 1 / 48;
          linea.to(
            cabezal,
            {
              t: v.duration,
              ease: "none",
              duration: 0.85,
              onUpdate: () => {
                if (v.readyState < 2) return;
                if (Math.abs(v.currentTime - cabezal.t) < MEDIO_CUADRO) return;
                v.currentTime = cabezal.t;
              },
            },
            0,
          );

          // La lamina se va cuando el pour ya se vio, no antes: el texto tiene
          // que estar el tiempo suficiente para leerse entero. Sale acelerando
          // —una hoja que se corre gana velocidad, no la pierde— al contrario
          // de las entradas del sitio, que frenan.
          //
          // Se va por donde esta apoyada: a la derecha en escritorio, hacia
          // arriba en pantalla angosta, donde la lamina ocupa la banda de
          // arriba y lo que descubre al irse es el barista y la jarra.
          linea.to(
            l,
            escritorio
              ? { xPercent: 102, ease: "power1.in", duration: 0.35 }
              : { yPercent: -102, ease: "power1.in", duration: 0.35 },
            0.45,
          );

        },
      );
    };

    if (v.readyState >= 1) armar();
    else v.addEventListener("loadedmetadata", armar);

    return () => {
      window.removeEventListener("touchstart", despertar);
      v.removeEventListener("loadedmetadata", armar);
      mm.revert();
    };
  }, [animar]);

  return (
    <header
      ref={contenedor}
      // Lo lee PanelBrumita para no poner la burbuja encima del hero.
      data-hero
      className="relative flex h-svh flex-col overflow-hidden"
    >
      {/* La cabecera en paper es del alto exacto de la barra fija (py-4 + el
          logo, 60px y 64px en lg). El logo y los links nunca caen sobre el
          video, que cambia de luminancia cuadro a cuadro: no hay color de
          texto que se lea sobre los 121. */}
      <div className="h-15 shrink-0 border-b border-linea lg:h-16" />

      <div className="relative flex-1 overflow-hidden">
        {/* El poster es el cuadro 0 del propio clip, asi que el video entra
            encima sin que se vea el cambio. Va como <picture> y no como
            next/image porque son dos recortes distintos —uno ancho y uno
            cerrado sobre la taza— y `media` elige uno solo. */}
        <picture>
          <source media="(min-width: 768px)" srcSet="/hero/pour-ancho.webp" />
          <img
            src="/hero/pour-alto.webp"
            alt={t.hero.alt}
            width={720}
            height={656}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover object-[50%_50%] md:object-[40%_50%]"
          />
        </picture>

        {animar && (
          <video
            ref={video}
            // El recorte ancho deja entrar la maquina, que en escritorio queda
            // tapada por la lamina. En pantalla angosta esa mitad no aporta y
            // el cover se comeria la taza, asi que ahi va un recorte cerrado.
            src={
              typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
                ? VIDEO_ANCHO
                : VIDEO_ALTO
            }
            muted
            playsInline
            preload="auto"
            aria-hidden
            disablePictureInPicture
            onCanPlay={() => setListo(true)}
            className={`absolute inset-0 size-full object-cover object-[50%_50%] transition-opacity duration-300 md:object-[40%_50%] ${
              listo ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* El cierre: la marca, adentro del cuadro y sin nada abajo.
            Sin banda, sin recuadro y sin velo: se compuso el logo real sobre el
            cuadro final y se miro. El centro tiene mediana 7,9:1 contra tinta;
            el peor 1% de la caja cae a 1,7:1, pero ese 1% esta donde no cae
            ninguna letra —la parte oscura de la maquina, abajo a la derecha— y
            el trazo del logo apoya entero sobre la ventana y los azulejos.
            Es la excepcion a "ningun texto sobre una foto", y como toda
            excepcion de este proyecto esta medida sobre la imagen concreta y no
            supuesta.

            Sube un 14% del alto para dejarle la taza libre abajo: es el premio
            del plano y no se le escribe encima.

            La entrada la hace Motion y no el scrub. Scrubeada, la marca se
            mueve con la rueda del mouse; disparada, entra con su propio tiempo
            y se lee como un titulo. Motion ademas resuelve solo la
            interrupcion, que es lo que pasa cuando alguien sube y baja rapido.

            aria-hidden porque no aporta nada que no este ya en el h1 y en la
            barra: para un lector de pantalla seria un bloque que aparece y
            desaparece al scrollear, que es ruido. */}
        {animar && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 pb-[14%] lg:gap-6"
            initial={false}
            animate={marcaVisible ? "visible" : "oculta"}
            variants={{ visible: { transition: { staggerChildren: 0.08 } }, oculta: {} }}
          >
            {/* El ancho va en porcentaje del cuadro y no en pixeles: el video
                entra con object-cover, asi que cuanto de la escena se ve
                depende del alto del viewport. Con un tamano fijo, el logo que
                queda justo en un monitor se le sale de la ventana clara a
                otro. */}
            <motion.div variants={ENTRADA_MARCA} className="w-[64%] max-w-[300px] lg:w-[46%] lg:max-w-[680px]">
              <Image
                src="/logo.png"
                alt=""
                width={1144}
                height={400}
                className="h-auto w-full"
              />
            </motion.div>
            <motion.p
              variants={ENTRADA_MARCA}
              // Un toque mas que la etiqueta del sistema: debajo de un logo de
              // 46% del cuadro, 0.75rem queda huerfano. No mas, porque el
              // rotulo en caps narrow tiene que seguir leyendose como rotulo.
              className="t-etiqueta t-etiqueta-cierre text-tinta"
            >
              {t.hero.eslogan}
            </motion.p>
          </motion.div>
        )}

        {/* La lamina. En escritorio es una columna a la derecha, que tapa la
            maquina —lo visualmente ruidoso— y deja libres al barista, la jarra
            y la taza. El filete de 1px es el borde de la hoja.
            En pantalla angosta va arriba, no abajo: el cuadro no tiene sobrante
            vertical para reencuadrar —la altura del clip entra justa— asi que
            la taza cae siempre al 62% del alto, y una banda abajo la tapa
            exactamente a ella, que es el sujeto. Arriba tapa el brazo, que es
            lo que sobra. */}
        <div
          ref={lamina}
          className="absolute inset-x-0 top-0 border-b border-linea bg-paper will-change-transform lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[46%] lg:max-w-[640px] lg:border-b-0 lg:border-l"
        >
          <div className="flex flex-col gap-8 px-6 py-8 lg:h-full lg:justify-between lg:gap-10 lg:px-12 lg:py-14">
            <div>
              <p className="t-etiqueta text-tinta-suave">{t.hero.etiqueta}</p>
              {/* La medida corta obliga a dos o tres lineas. En una sola el
                  titular queda de la altura de un parrafo y la lamina se ve
                  vacia debajo; apilado, ocupa lo que tiene que ocupar. */}
              <h1 className="t-display mt-5 max-w-[15ch] text-[clamp(2.5rem,5vw,4.25rem)] text-balance">
                {t.hero.titulo}
              </h1>
              <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-tinta-suave">
                {t.hero.bajada}
              </p>
            </div>

            {/* El filete le pone borde al aire de arriba. Sin el, una columna
                de 800px con el texto pegado al techo y las acciones al piso se
                lee inconclusa; con el, el vacio es un margen declarado. */}
            <div className="lg:border-t lg:border-linea lg:pt-8">
              <p className="t-etiqueta text-tinta-suave">{t.hero.horario}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="#carta"
                  className="t-etiqueta bg-tinta px-6 py-[18px] text-paper lg:px-9 transition-colors duration-300 hover:bg-[var(--etapa)]"
                >
                  {t.hero.verCarta}
                </a>
                <a
                  href="#donde"
                  className="t-etiqueta border border-tinta px-6 py-[18px] text-tinta lg:px-9 transition-colors duration-300 hover:border-[var(--etapa)] hover:text-[var(--etapa)]"
                >
                  {t.hero.dondeEstamos}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
