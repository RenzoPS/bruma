"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll suave, y el puente entre Lenis y ScrollTrigger.
 *
 * El puente no es opcional: Lenis deja de mover el scroll nativo y lo interpola
 * por su cuenta, asi que ScrollTrigger se queda leyendo una posicion vieja y
 * cualquier animacion con scrub va medio cuadro atras del scroll. Se arregla
 * avisandole a ScrollTrigger en cada frame de Lenis y corriendo los dos sobre
 * el mismo ticker de GSAP, para que no haya dos requestAnimationFrame
 * compitiendo.
 *
 * Todo se apaga con prefers-reduced-motion: para quien pidio no tener
 * movimiento, un scroll que sigue corriendo despues de soltar la rueda es
 * exactamente lo que no quiere.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.1,
      // Sale rapido y frena largo: se siente como peso, no como demora.
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);

    const avanzar = (tiempo: number) => lenis.raf(tiempo * 1000);
    gsap.ticker.add(avanzar);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(avanzar);
      lenis.destroy();
    };
  }, []);

  return null;
}
