"use client";

import { AccionAviso, Aviso } from "@/components/Aviso";
import { useT } from "@/lib/i18n";

/**
 * El 404.
 *
 * Es cliente y no servidor porque los textos salen del diccionario, que vive en
 * un contexto. La alternativa era escribirlo solo en castellano: alguien que
 * navega el sitio en inglés y se equivoca de URL merece el mismo idioma que
 * venía leyendo.
 */
export default function NoEncontrada() {
  const t = useT();

  return (
    <Aviso
      etiqueta={t.errores.noEncontrada.etiqueta}
      titulo={t.errores.noEncontrada.titulo}
      texto={t.errores.noEncontrada.texto}
    >
      <AccionAviso href="/">{t.errores.noEncontrada.volver}</AccionAviso>
    </Aviso>
  );
}
