import type { Metadata } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/Footer";
import { ProveedorIdioma } from "@/lib/i18n";
import { ProveedorBrumita } from "@/lib/brumita";
import { PanelBrumita } from "@/components/PanelBrumita";
import { SITIO } from "@/lib/sitio";

// Una sola familia para todo el sistema. El eje de ancho da el expanded del
// display y el narrow de las etiquetas desde el mismo archivo, asi que el
// presupuesto de peso se gasta en las fotos y no en tipografia.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Los titulares piden caracter y Archivo no lo tiene: es una grotesca de
// trabajo, perfecta para datos y rotulos, generica en display. Instrument Serif
// da el registro de cafeteria sin caer en Playfair ni Fraunces, que son lo que
// genera cualquier modelo cuando le piden "cafe".
const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/**
 * Metadata del servidor, en castellano.
 *
 * El sitio traduce en el cliente —no hay rutas /es y /en, ver `ProveedorIdioma`—
 * asi que esto es lo que ve un crawler y lo que viaja en un link compartido.
 * `ProveedorIdioma` reescribe title y description al montar, pero eso llega
 * tarde para un bot: para ellos BRUMA es un sitio en castellano, y esta bien,
 * porque el local es de Buenos Aires.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "BRUMA — Café de especialidad, tostado a la vista",
  description:
    "Cafetería de especialidad con tostadora propia en el local. Tostamos, molemos y servimos a puertas abiertas.",
  applicationName: "BRUMA",
  authors: [{ name: "Renzo" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITIO,
    siteName: "BRUMA",
    title: "BRUMA — Café de especialidad, tostado a la vista",
    description:
      "Cafetería ficticia con Brumita, una asistente RAG que responde con las herramientas como única fuente. Pieza de portfolio.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRUMA — Café de especialidad, tostado a la vista",
    description:
      "Cafetería ficticia con Brumita, una asistente RAG que responde con las herramientas como única fuente. Pieza de portfolio.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${archivo.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ProveedorIdioma>
          {/* La conversacion vive en el layout y no en la home: la burbuja
              acompana en las tres paginas, y el estado del chat sobrevive a
              navegar de la carta a los granos. */}
          <ProveedorBrumita>
            <SmoothScroll />
            <Navbar />
            {children}
            <Footer />
            <PanelBrumita />
          </ProveedorBrumita>
        </ProveedorIdioma>
      </body>
    </html>
  );
}
