import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/sitio";

/**
 * Las tres páginas del sitio.
 *
 * Escritas a mano y no derivadas del árbol de `app/`: son tres, no cambian solas
 * y un generador que las descubra tendría que aprender a excluir `/api/`. La
 * lista corta es más honesta que la abstracción.
 *
 * Sin entradas por idioma: no hay rutas por locale —el idioma se elige en el
 * cliente, ver `ProveedorIdioma`— así que cada página es una sola URL. Duplicar
 * el sitemap con `/es` y `/en` que no existen sería declarar contenido que
 * devuelve 404.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  return [
    { url: SITIO, lastModified: ahora, changeFrequency: "monthly", priority: 1 },
    { url: `${SITIO}/cafeteria`, lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITIO}/granos`, lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
  ];
}
