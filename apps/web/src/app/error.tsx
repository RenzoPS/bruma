"use client";

import { useEffect } from "react";
import { AccionAviso, Aviso } from "@/components/Aviso";
import { useT } from "@/lib/i18n";

/**
 * El error de render de cualquier página.
 *
 * No cubre el chat: Brumita atiende sus propios errores adentro del panel, con
 * su reintento, porque perder la conversación entera por una respuesta cortada
 * sería peor que el error. Esto es para lo otro — una página que no pudo
 * renderizar.
 *
 * `reset()` vuelve a montar el árbol sin recargar. Se ofrece primero porque un
 * error de render suele ser transitorio, y recargar cuesta las fuentes y las
 * fotos de nuevo.
 */
export default function ErrorDePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  // El detalle va a la consola y no a la pantalla: al visitante no le sirve el
  // stack, y el `digest` es lo que después permite encontrarlo en los logs del
  // servidor sin exponerlo en el HTML.
  useEffect(() => {
    console.error("Falló el render de la página:", error.digest ?? error.message);
  }, [error]);

  return (
    <Aviso
      etiqueta={t.errores.roto.etiqueta}
      titulo={t.errores.roto.titulo}
      texto={t.errores.roto.texto}
    >
      <AccionAviso onClick={reset}>{t.errores.roto.reintentar}</AccionAviso>
      <AccionAviso href="/">{t.errores.roto.volver}</AccionAviso>
    </Aviso>
  );
}
