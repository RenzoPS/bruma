"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bean,
  ChevronRight,
  FileText,
  Info,
  MapPin,
  RotateCcw,
  ScrollText,
  Square,
  X,
  type LucideIcon,
} from "lucide-react";
import { consultandoAhora, fuentesDe, textoDe, useBrumita, type Fuente } from "@/lib/brumita";
import { useT } from "@/lib/i18n";

/**
 * La conversacion con Brumita: la burbuja persistente y el panel que abre.
 *
 * No hay globos de chat. El sistema no tiene radios ni sombras, asi que un
 * intercambio se compone como lo que es en este mundo: **una transcripcion
 * impresa**. Cada turno lleva su rotulo narrow en caps —VOS, BRUMITA— y los
 * turnos se separan con un filete de 1px. Es la misma gramatica que usan las
 * estaciones del recorrido, aplicada a un dialogo.
 *
 * Abajo de cada respuesta va que consulto para escribirla, y eso no es un
 * adorno de transparencia: sale de las partes de tool del mensaje, asi que no
 * puede decir que miro la carta si no la miro.
 *
 * Los iconos son de lucide a trazo 1.5, que es lo mas cerca del filete de 1px
 * del sistema sin que a 16px se corten. Van donde una palabra seria peor
 * —cerrar, enviar, detener, la fuente de un dato— y **no** reemplazan a las
 * etiquetas: el rotulo en caps sigue diciendo VOS y BRUMITA, porque ahi la
 * palabra es el contenido y no la accion.
 */

/** El vapor del logo, recortado del propio archivo de marca. Es Brumita. */
function Vapor({ className }: { className?: string }) {
  return (
    <Image src="/vapor.png" alt="" width={206} height={223} className={className} aria-hidden />
  );
}

/** Cada fuente con su icono: se reconoce de donde salio el dato sin leer. */
const ICONO_FUENTE: Record<Fuente, LucideIcon> = {
  buscarProductos: ScrollText,
  verGranos: Bean,
  buscarEnFichas: FileText,
  horariosYUbicacion: MapPin,
};

export function PanelBrumita() {
  const t = useT();
  const { mensajes, estado, error, abierto, abrir, cerrar, preguntar, detener, reintentar } =
    useBrumita();

  const [borrador, setBorrador] = useState("");
  // La burbuja no aparece sobre el hero: ahi compite con las acciones del
  // propio hero y, en pantalla angosta, se monta arriba de la marca con la que
  // cierra la animacion. Se mide el piso del hero en vez de un umbral de scroll
  // fijo porque el hero esta pineado y ocupa dos viewports de recorrido. En las
  // paginas sin hero no hay nada que medir y la burbuja esta desde arriba.
  const [pasoElHero, setPasoElHero] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const burbuja = useRef<HTMLButtonElement>(null);
  const fondo = useRef<HTMLDivElement>(null);

  const trabajando = estado === "submitted" || estado === "streaming";
  const ultimo = mensajes.at(-1);
  // La respuesta en curso, si ya existe. Mientras el estado es "submitted" el
  // ultimo mensaje sigue siendo la pregunta del visitante, y confundir uno con
  // otro deja el indicador de trabajo sin aparecer nunca: el texto del ultimo
  // mensaje no esta vacio, pero porque es la pregunta.
  const respuesta = ultimo?.role === "assistant" ? ultimo : undefined;
  const consultando = trabajando ? consultandoAhora(respuesta) : undefined;

  // Al abrir, el foco va al campo; al cerrar, vuelve a la burbuja. Sin esto,
  // quien navega con teclado abre el panel y queda parado al principio del
  // documento.
  useEffect(() => {
    if (abierto) campo.current?.focus();
    else burbuja.current?.focus({ preventScroll: true });
  }, [abierto]);

  useEffect(() => {
    const alScrollear = () => {
      const hero = document.querySelector("[data-hero]");
      const piso = hero ? hero.getBoundingClientRect().bottom : 0;
      setPasoElHero(piso <= 0);
    };
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  // Escape cierra, y el Tab no se escapa del panel.
  //
  // Lo segundo faltaba y se notaba: en pantalla angosta el panel tapa la pagina
  // entera, pero el foco seguia caminando por los links de atras, invisibles.
  // Quien navega con teclado terminaba tabulando a ciegas por un sitio que no
  // podia ver. Es lo que `aria-modal` le promete a un lector de pantalla, asi
  // que sin esto la promesa era falsa.
  //
  // El ciclo se arma leyendo el DOM en el momento del Tab y no con una lista
  // guardada: el contenido del panel cambia —aparecen las fuentes, el boton de
  // reintentar, el de detener— y una lista calculada al abrir queda vieja.
  useEffect(() => {
    if (!abierto) return;

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
        return;
      }
      if (evento.key !== "Tab") return;

      const panel = document.getElementById("panel-brumita");
      if (!panel) return;

      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (!primero || !ultimo) return;

      // Solo se interviene en los dos bordes; en el medio manda el navegador,
      // que ya sabe cual es el orden correcto.
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, cerrar]);

  // Seguir el final de la conversacion mientras la respuesta se escribe.
  useEffect(() => {
    if (!abierto) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fondo.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "end" });
  }, [mensajes, estado, abierto]);

  const enviar = () => {
    if (!borrador.trim() || trabajando) return;
    preguntar(borrador);
    setBorrador("");
    // El alto lo fija el onChange en linea, asi que vaciar el valor no lo
    // devuelve solo: sin esto el campo queda con el tamano de la pregunta
    // anterior, vacio y de tres renglones.
    if (campo.current) campo.current.style.height = "auto";
  };

  return (
    <>
      {/* El unico elemento con permiso para flotar sobre el resto.
          Es tambien el unico redondo del sitio, y esa es una excepcion
          deliberada: el sistema no redondea nada, pero este boton ya venia con
          permiso especial por flotar, y un circulo es lo que hace que se lea
          como un boton de accion y no como un bloque de contenido suelto. La
          notita, en cambio, es un rectangulo con su filete, como todo lo demas.

          El texto va afuera del boton y no adentro: adentro obliga a un
          rectangulo ancho que compite con el contenido de la pagina. */}
      <div
        className={`group fixed right-6 bottom-6 z-40 transition-opacity duration-300 lg:right-12 lg:bottom-12 ${
          abierto || !pasoElHero ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span
          aria-hidden
          className="t-etiqueta pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 translate-x-2 border border-linea bg-paper px-4 py-3 whitespace-nowrap text-tinta opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
        >
          {t.brumita.abrir}
        </span>

        <button
          ref={burbuja}
          type="button"
          onClick={() => abrir()}
          aria-expanded={abierto}
          aria-controls="panel-brumita"
          aria-label={t.brumita.abrir}
          // Invisible por opacidad seguiria siendo tabulable: `inert` lo saca
          // del orden de tabulacion y del arbol de accesibilidad, y deja la
          // transicion, que `hidden` se llevaria puesta.
          inert={abierto || !pasoElHero}
          className="flex size-14 items-center justify-center rounded-full border border-tinta bg-paper transition-colors duration-300 hover:border-[var(--etapa)] focus-visible:border-[var(--etapa)] focus-visible:outline-none lg:size-16"
        >
          <Vapor className="h-6 w-auto lg:h-7" />
        </button>
      </div>

      <div
        id="panel-brumita"
        role="dialog"
        // Con el foco atrapado adentro (ver el efecto de arriba), esto ya no es
        // una promesa vacia: le dice al lector de pantalla que el resto de la
        // pagina no esta disponible mientras el panel este abierto.
        aria-modal={abierto}
        aria-label={t.brumita.etiqueta}
        // `hidden` y no un desmontaje: el panel guarda su scroll y su borrador
        // entre aperturas, y la conversacion no parpadea al volver.
        hidden={!abierto}
        className="fixed inset-0 z-50 flex flex-col border-linea bg-paper lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[440px] lg:border-l"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-linea px-6 py-5">
          <div className="flex items-center gap-3">
            <Vapor className="h-8 w-auto" />
            <div>
              <p className="t-etiqueta text-tinta">{t.brumita.ella}</p>
              <p className="mt-1 text-sm text-tinta-suave">{t.brumita.rol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label={t.brumita.cerrarAria}
            className="-mt-1 -mr-2 p-2 text-tinta-suave transition-colors duration-200 hover:text-[var(--etapa)]"
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div role="log" className="flex-1 overflow-y-auto px-6 py-6">
          {mensajes.length === 0 && (
            <div className="flex flex-col gap-8">
              <p className="max-w-[38ch] leading-relaxed text-tinta-suave">{t.brumita.vacio}</p>

              {/* Cada sugerencia es una fila con su filete y su flecha, no un
                  renglon subrayado suelto: se ve que son cosas para tocar. */}
              <div>
                <p className="t-etiqueta text-tinta-suave">{t.brumita.empezar}</p>
                <ul className="mt-3 border-t border-linea">
                  {t.brumita.preguntas.map((pregunta) => (
                    <li key={pregunta} className="border-b border-linea">
                      <button
                        type="button"
                        onClick={() => preguntar(pregunta)}
                        className="group flex w-full items-center gap-3 py-3 text-left leading-relaxed text-tinta transition-colors duration-200 hover:text-[var(--etapa)]"
                      >
                        <span className="flex-1">{pregunta}</span>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.5}
                          aria-hidden
                          className="shrink-0 text-tinta-suave transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--etapa)]"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* La ficcion se declara donde alguien podria creerle un precio:
                  adentro de la conversacion, no solo en el footer. */}
              <p className="t-etiqueta flex gap-2 text-tinta-suave">
                <Info size={14} strokeWidth={1.5} aria-hidden className="mt-px shrink-0" />
                <span>{t.brumita.ficcion}</span>
              </p>
            </div>
          )}

          {mensajes.map((mensaje, i) => {
            const texto = textoDe(mensaje);
            const fuentes = mensaje.role === "assistant" ? fuentesDe(mensaje) : [];

            return (
              <article
                key={mensaje.id}
                className={i > 0 ? "mt-6 border-t border-linea pt-6" : undefined}
              >
                <p className="t-etiqueta flex items-center gap-2 text-tinta-suave">
                  {mensaje.role === "assistant" && <Vapor className="h-4 w-auto" />}
                  {mensaje.role === "user" ? t.brumita.vos : t.brumita.ella}
                </p>
                {texto && (
                  <p className="mt-3 leading-relaxed whitespace-pre-wrap text-tinta">{texto}</p>
                )}

                {/* Un turno de Brumita que termino sin una sola letra.
                    Pasa cuando gasta todos sus pasos llamando tools y se queda
                    sin turno para escribir: medido, 1 de cada 5 veces con una
                    pregunta que cruza sabor y stock. Del lado del servidor se
                    subio el techo de pasos, pero el techo sigue existiendo y
                    algun dia se vuelve a tocar.

                    Sin esto la burbuja quedaba en blanco, que es la peor forma
                    de fallar: no parece un error, parece que Brumita no tiene
                    nada que decir. Se muestra la misma salida que un error de
                    verdad —un motivo y el reintento— porque para quien pregunta
                    es exactamente eso.

                    La condicion pide `!trabajando` y que sea el ultimo: mientras
                    la respuesta se esta escribiendo, no tener texto todavia es
                    lo normal. */}
                {mensaje.role === "assistant" &&
                  !texto &&
                  !trabajando &&
                  mensaje.id === ultimo?.id && (
                    <>
                      <p className="mt-3 leading-relaxed text-tinta-suave">{t.brumita.vacia}</p>
                      <button
                        type="button"
                        onClick={reintentar}
                        className="t-etiqueta mt-4 flex items-center gap-2 border border-tinta px-5 py-3 text-tinta transition-colors duration-300 hover:border-[var(--etapa)] hover:text-[var(--etapa)]"
                      >
                        <RotateCcw size={14} strokeWidth={1.5} aria-hidden />
                        {t.brumita.reintentar}
                      </button>
                    </>
                  )}

                {fuentes.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                    {fuentes.map(({ tool, granos }) => {
                      const Icono = ICONO_FUENTE[tool];
                      // Los nombres de grano ya traen una coma adentro ("Guji,
                      // Etiopía"), asi que separarlos con coma haria leer el
                      // doble de origenes de los que hay: van con punto medio.
                      // Y se muestran dos: la busqueda devuelve hasta cinco
                      // chunks y suelen tocar varios origenes, pero listar seis
                      // nombres deja de informar y pasa a ser ruido. Los
                      // primeros son los mas parecidos.
                      const visibles = granos.slice(0, 2).join(" · ");
                      const resto = granos.length - 2;
                      return (
                        <li
                          key={tool}
                          className="t-etiqueta flex items-center gap-2"
                          style={{ color: "var(--etapa)" }}
                        >
                          <Icono size={14} strokeWidth={1.5} aria-hidden className="shrink-0" />
                          <span>
                            {t.brumita.fuente[tool]}
                            {granos.length > 0 && ` · ${visibles}${resto > 0 ? ` +${resto}` : ""}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}

          {/* Lo que esta haciendo ahora. Es la unica parte de la interfaz que
              muestra el mecanismo en vivo, y con el modelo gratuito tardando
              varios segundos es lo unico que sostiene la espera. */}
          {trabajando && !(respuesta && textoDe(respuesta)) && (
            <p className="t-etiqueta mt-6 flex items-center gap-2 border-t border-linea pt-6 text-tinta-suave">
              <Vapor className="h-4 w-auto animate-pulse" />
              {consultando ? t.brumita.consultando[consultando] : t.brumita.pensando}
              <span aria-hidden>…</span>
            </p>
          )}

          {error && (
            <div className="mt-6 border-t pt-6" style={{ borderColor: "var(--etapa)" }}>
              <p className="leading-relaxed text-tinta">
                {/* El 429 es el unico error que tiene una accion distinta:
                    esperar. Los demas se reintentan. */}
                {error.message.includes("429") ? t.brumita.demasiadas : t.brumita.error}
              </p>
              <button
                type="button"
                onClick={reintentar}
                className="t-etiqueta mt-4 flex items-center gap-2 border border-tinta px-5 py-3 text-tinta transition-colors duration-300 hover:border-[var(--etapa)] hover:text-[var(--etapa)]"
              >
                <RotateCcw size={14} strokeWidth={1.5} aria-hidden />
                {t.brumita.reintentar}
              </button>
            </div>
          )}

          <div ref={fondo} />
        </div>

        {/* La respuesta terminada se anuncia una sola vez. Con el live region
            sobre el texto que se esta escribiendo, un lector de pantalla leeria
            cada token. */}
        <p aria-live="polite" className="sr-only">
          {estado === "ready" && ultimo?.role === "assistant" ? textoDe(ultimo) : ""}
        </p>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            enviar();
          }}
          className="flex shrink-0 items-end gap-3 border-t border-linea px-6 py-4"
        >
          <label htmlFor="pregunta-brumita" className="sr-only">
            {t.brumita.campo}
          </label>
          <textarea
            id="pregunta-brumita"
            ref={campo}
            rows={1}
            value={borrador}
            maxLength={1000}
            placeholder={t.brumita.marcador}
            onChange={(evento) => {
              setBorrador(evento.target.value);
              // Crece con el texto hasta cinco lineas y despues scrollea.
              const caja = evento.target;
              caja.style.height = "auto";
              caja.style.height = `${Math.min(caja.scrollHeight, 120)}px`;
            }}
            onKeyDown={(evento) => {
              // Enter manda, Shift+Enter hace salto de linea: es lo que espera
              // cualquiera que haya usado un chat.
              if (evento.key === "Enter" && !evento.shiftKey) {
                evento.preventDefault();
                enviar();
              }
            }}
            className="flex-1 resize-none border border-linea bg-paper px-3 py-3 leading-relaxed text-tinta placeholder:text-tinta-suave focus:border-[var(--etapa)] focus:outline-none"
          />
          {/* Cuadrado, del alto del campo. La flecha manda y el cuadrado
              detiene, que es la convencion que ya conoce cualquiera. */}
          <button
            type={trabajando ? "button" : "submit"}
            onClick={trabajando ? detener : undefined}
            disabled={!trabajando && borrador.trim().length === 0}
            aria-label={trabajando ? t.brumita.detener : t.brumita.enviar}
            className="flex size-[50px] shrink-0 items-center justify-center bg-tinta text-paper transition-colors duration-300 hover:bg-[var(--etapa)] disabled:cursor-not-allowed disabled:bg-tinta-suave"
          >
            {trabajando ? (
              <Square size={16} strokeWidth={1.5} fill="currentColor" aria-hidden />
            ) : (
              <ArrowUp size={20} strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </form>
      </div>
    </>
  );
}
