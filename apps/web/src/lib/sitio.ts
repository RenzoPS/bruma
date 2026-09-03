/**
 * De dónde se sirve el sitio.
 *
 * Lo necesitan tres lugares que no deberían conocerse entre sí: la metadata del
 * layout (para las URL absolutas de Open Graph), `robots.ts` (para apuntar al
 * sitemap) y `sitemap.ts` (para las entradas). Escrito tres veces, cambiar el
 * dominio dejaría dos correctos y uno viejo, y el que quede viejo apunta a otro
 * lado sin fallar.
 *
 * Sale del entorno y no de una constante porque la URL de un preview no es la de
 * producción. `NEXT_PUBLIC_` es necesario: el layout se prerenderiza, así que la
 * variable tiene que estar disponible en build time.
 */
export const SITIO = process.env.NEXT_PUBLIC_SITIO ?? "http://localhost:3000";
