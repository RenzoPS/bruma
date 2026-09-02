"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Retraso en segundos, para escalonar elementos hermanos. */
  demora?: number;
  className?: string;
};

/**
 * Revelado al entrar en pantalla.
 *
 * Un solo gesto para toda la pagina: sube doce pixeles y aparece. Nada de
 * mascaras ni recortes — se probaron y se ven bruscos, porque un texto que
 * salta desde afuera de su propia caja llama mas la atencion que el texto.
 *
 * `whileInView` con `once` deja el elemento quieto despues de la primera vez:
 * un sitio donde todo vuelve a animarse cada vez que subis y bajas cansa.
 */
export function Revelar({ children, demora = 0, className }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.55,
        delay: demora,
        // La misma curva del scroll suave, para que todo el sitio frene igual.
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
