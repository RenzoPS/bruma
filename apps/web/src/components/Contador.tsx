"use client";

import { useEffect, useRef, useState } from "react";

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
 */
export function Contador({ valor, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mostrado, setMostrado] = useState(valor);
  const yaCorrio = useRef(false);

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

    setMostrado(valor.replace(/\d/g, "0"));

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting || yaCorrio.current) return;
        yaCorrio.current = true;

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

          let i = 0;
          setMostrado(valor.replace(/\d/g, () => actual[i++] ?? "0"));

          if (t < 1) requestAnimationFrame(paso);
          else setMostrado(valor);
        };

        requestAnimationFrame(paso);
      },
      { threshold: 0.6 },
    );

    observer.observe(nodo);
    return () => observer.disconnect();
  }, [valor]);

  return (
    <span ref={ref} className={className}>
      {mostrado}
    </span>
  );
}
