import type { Textos } from "./i18n/es";

/**
 * La carta del local.
 *
 * Aca vive solo lo que no se traduce: categoria, precio, disponibilidad y foto.
 * El nombre y la descripcion salen del diccionario por clave, asi que agregar
 * un producto obliga a escribirlo en los dos idiomas o no compila.
 *
 * Marca ficticia: los precios son inventados y la pagina lo declara en el pie.
 * Los mismos datos van despues a la tabla `productos`, que Brumita consulta por
 * tool calling y nunca por busqueda vectorial: un precio se responde exacto o
 * no se responde.
 *
 * Precios en pesos. En la base van en centavos, por la misma razon de siempre:
 * 0.1 + 0.2 no da 0.3 y una carta no se redondea sola.
 */

export type Categoria = "cafe" | "acompanar" | "desayuno" | "grano";
export type ClaveProducto = keyof Textos["carta"]["productos"];

export type Producto = {
  clave: ClaveProducto;
  categoria: Categoria;
  precio: number;
  disponible: boolean;
  /** Cada item con su foto: el que entra a decidir necesita ver que esta pidiendo. */
  imagen: string;
};

export const CATEGORIAS: Categoria[] = ["cafe", "acompanar", "desayuno", "grano"];

const F = "/estaciones/";

export const CARTA: Producto[] = [
  { clave: "espresso", categoria: "cafe", precio: 3200, disponible: true, imagen: `${F}taza.jpg` },
  { clave: "cortado", categoria: "cafe", precio: 3600, disponible: true, imagen: `${F}cortado.jpg` },
  { clave: "flatWhite", categoria: "cafe", precio: 4800, disponible: true, imagen: `${F}taza-logo.jpg` },
  { clave: "v60", categoria: "cafe", precio: 5200, disponible: true, imagen: `${F}v60.jpg` },
  { clave: "coldBrew", categoria: "cafe", precio: 5400, disponible: true, imagen: `${F}coldbrew.jpg` },

  { clave: "medialuna", categoria: "acompanar", precio: 1400, disponible: true, imagen: `${F}medialuna.jpg` },
  { clave: "tostado", categoria: "acompanar", precio: 6800, disponible: true, imagen: `${F}tostado.jpg` },
  { clave: "budin", categoria: "acompanar", precio: 3900, disponible: true, imagen: `${F}budin.jpg` },
  { clave: "alfajor", categoria: "acompanar", precio: 2600, disponible: true, imagen: `${F}alfajor.jpg` },

  { clave: "desayunoBruma", categoria: "desayuno", precio: 9800, disponible: true, imagen: `${F}mesa.jpg` },
  { clave: "desayunoCompleto", categoria: "desayuno", precio: 12500, disponible: true, imagen: `${F}desayuno-completo.jpg` },
  { clave: "promo", categoria: "desayuno", precio: 4900, disponible: true, imagen: `${F}medialuna.jpg` },

  { clave: "guji", categoria: "grano", precio: 18000, disponible: true, imagen: `${F}verde.jpg` },
  { clave: "huila", categoria: "grano", precio: 15500, disponible: true, imagen: `${F}molino.jpg` },
  { clave: "cerrado", categoria: "grano", precio: 14500, disponible: true, imagen: `${F}granos-bol.jpg` },
  { clave: "narino", categoria: "grano", precio: 16800, disponible: false, imagen: `${F}tueste-b.jpg` },
];

/**
 * El formato de precio sigue al idioma: en español van los miles con punto, en
 * inglés con coma. Es el detalle que delata una traducción a medias.
 */
export const precio = (pesos: number, idioma: "es" | "en") =>
  `$${pesos.toLocaleString(idioma === "es" ? "es-AR" : "en-US")}`;
