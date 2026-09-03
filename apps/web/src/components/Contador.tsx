"use client";

import { useEffect, useRef } from "react";

type Props = { valor: string; className?: string };

/**
 * El dato sube hasta su valor cuando entra en pantalla.
 *
 * Es el unico movimiento que se repite en la pagina, y se repite porque
 * pertenece al mundo: un panel de tostadora tiene numeros que suben mientras la
 * maquina trabaja. No es una entrada generica aplicada a cada seccion — es el
 * comportamiento nativo de un instrumento.
 *
 * Solo anima lo que es numero. "Guji, Etiopia" se muestra y ya; "11:20" cuenta.
 *
 * **El valor animado no pasa por el estado de React, y son tres razones.**
 *
 * La primera es correctitud: el render tiene que devolver `valor`, porque eso es
 * lo que ve el HTML del servidor, el que navega sin JS y el que indexa. La
 * version anterior arrancaba en cero y lo corregia con un setState adentro de un
 * efecto — que ademas era un error de lint (`react-hooks/set-state-in-effect`).
 *
 * La segunda es que un numero que sube es una animacion, no un estado: 900 ms a
 * 60 fps son ~54 renders de React para escribir texto adentro de un span. El
 * `textContent` va directo al nodo, que es lo mismo que hace GSAP en el hero.
 *
 * La tercera es el parpadeo. Poner los ceros con un efecto los pinta **despues**
 * del primer cuadro, asi que se alcanzaba a ver el numero real antes de que
 * volviera a cero. Escribiendo el nodo en el mismo efecto, antes de observar,
 * el navegador nunca compone ese cuadro intermedio.
 */
export function Contador({ valor, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    // Se anima el patron numerico, conservando separadores y dos puntos:
    // "1.940" cuenta, "11:20" cuenta, "Guji, Etiopia" no.
    const digitos = valor.replace(/\D/g, "");
    if (!digitos) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const objetivo = Number(digitos);
    if (!Number.isFinite(objetivo) || objetivo === 0) return;

    const conDigitos = (cuenta: string) => {
      let i = 0;
      return valor.replace(/\d/g, () => cuenta[i++] ?? "0");
    };

    nodo.textContent = conDigitos("0".repeat(digitos.length));

    let cuadro = 0;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        // Una sola vez: se deja de mirar apenas arranca, asi no hace falta un
        // ref que recuerde si ya corrio.
        observer.disconnect();

        const duracion = 900;
        const inicio = performance.now();

        const paso = (ahora: number) => {
          const t = Math.min(1, (ahora - inicio) / duracion);
          // Desaceleracion exponencial: llega rapido al orden de magnitud y
          // afina el final, como una aguja asentandose.
          const eased = 1 - 2 ** (-10 * t);
          const actual = Math.round(objetivo * eased)
            .toString()
            .padStart(digitos.length, "0");

          nodo.textContent = t < 1 ? conDigitos(actual) : valor;
          if (t < 1) cuadro = requestAnimationFrame(paso);
        };

        cuadro = requestAnimationFrame(paso);
      },
      { threshold: 0.6 },
    );

    observer.observe(nodo);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(cuadro);
      // Si el efecto se rehace a mitad de la cuenta —cambio `valor`, o React
      // remonto en desarrollo— el nodo se queda con el numero a medias. Lo que
      // corresponde mostrar sin animacion es el valor final.
      nodo.textContent = valor;
    };
  }, [valor]);

  return (
    <span ref={ref} className={className}>
      {valor}
    </span>
  );
}
