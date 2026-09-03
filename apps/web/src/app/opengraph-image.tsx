import { ImageResponse } from "next/og";

/**
 * La tarjeta que se ve cuando alguien pega el link.
 *
 * Se dibuja acá en vez de guardar un JPG en public/ por una razón concreta: una
 * imagen social lleva texto, y un texto en un binario es un texto que nadie va a
 * corregir. Escrita como JSX, cambiar el título es cambiar una línea.
 *
 * No usa las fuentes del sitio a propósito. `ImageResponse` necesita el archivo
 * de la fuente cargado a mano —next/font no llega acá— y eso son dos fetch más
 * en el build para un lienzo de 1200×630 que se ve al tamaño de una miniatura.
 * El sistema del sitio es tipográfico; esta pieza es un cartel, y el cartel se
 * apoya en el color y en la proporción, que sí son los del sitio.
 */

export const alt = "BRUMA — Café de especialidad, tostado a la vista";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Copiados de globals.css: --color-paper, --color-tinta y --color-canela. Van
// literales porque ImageResponse no resuelve variables CSS — renderiza con su
// propio motor, no con el navegador. Es la única duplicación de un token en el
// proyecto y vive acá, en tres constantes con nombre, para que se vea.
const PAPER = "#f2f3f0";
const TINTA = "#241812";
const CANELA = "#c1662f";

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: TINTA,
          padding: 72,
          // El filete de 1px del sistema, escalado al tamaño del lienzo.
          border: `2px solid ${TINTA}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 6 }}>
          <span style={{ textTransform: "uppercase" }}>Buenos Aires</span>
          <span style={{ textTransform: "uppercase", color: CANELA }}>Pieza de portfolio</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 128, fontWeight: 700, letterSpacing: 24, lineHeight: 1 }}>BRUMA</span>
          <span style={{ fontSize: 40, lineHeight: 1.3, maxWidth: 820 }}>
            Café de especialidad, tostado a la vista.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            borderTop: `2px solid ${TINTA}`,
            paddingTop: 28,
          }}
        >
          <span style={{ color: CANELA }}>Brumita</span>
          <span>·</span>
          <span>Asistente RAG · Next 16 · Express · pgvector</span>
        </div>
      </div>
    ),
    size,
  );
}
