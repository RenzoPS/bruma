import type { Metadata } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/Footer";
import { ProveedorIdioma } from "@/lib/i18n";
import { ProveedorBrumita } from "@/lib/brumita";
import { PanelBrumita } from "@/components/PanelBrumita";

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

export const metadata: Metadata = {
  title: "BRUMA — Café de especialidad, tostado a la vista",
  description:
    "Cafetería de especialidad con tostadora propia en el local. Tostamos, molemos y servimos a puertas abiertas.",
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
