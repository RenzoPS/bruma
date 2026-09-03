import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/sitio";

/**
 * Qué puede recorrer un crawler.
 *
 * Todo el sitio menos `/api/`, que es el proxy del chat: es un POST que abre un
 * stream contra Gemini, así que un bot que lo visite no encuentra nada que
 * indexar y sí gasta cuota. No es una defensa —un crawler malicioso ignora este
 * archivo— sino la señal correcta para los que lo respetan. La defensa es el
 * límite por IP de la API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
