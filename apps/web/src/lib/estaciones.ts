import type { Textos } from "./i18n/es";

/**
 * Las estaciones del recorrido, en el orden real del proceso.
 *
 * Aca vive solo lo que no se traduce: el orden, la etapa del tueste que define
 * el color, la foto y el numero del dato. El texto sale del diccionario, asi
 * que agregar una estacion obliga a escribirla en los dos idiomas o no compila.
 *
 * Marca ficticia: los origenes, las fincas y las fechas son inventados. Los
 * paises son reales porque son geografia. No hay nombres de productores ni de
 * cooperativas reales, ni sellos ni puntajes de organismos reales.
 */

export type Etapa = "verde" | "amarillo" | "canela" | "tostado" | "oscuro";

export type ClaveEstacion = keyof Textos["estaciones"];

export type Estacion = {
  id: ClaveEstacion;
  /** Define el color de acento mientras esta estacion es la visible. */
  etapa: Etapa;
  dato: { valor: string; unidad?: string };
  imagen: string;
};

export const ESTACIONES: Estacion[] = [
  { id: "verde", etapa: "verde", dato: { valor: "1.940", unidad: "msnm" }, imagen: "/estaciones/verde.jpg" },
  { id: "tostadora", etapa: "amarillo", dato: { valor: "11:20" }, imagen: "/estaciones/tostadora.jpg" },
  { id: "molino", etapa: "canela", dato: { valor: "15", unidad: "min" }, imagen: "/estaciones/molino.jpg" },
  { id: "taza", etapa: "tostado", dato: { valor: "25", unidad: "s" }, imagen: "/estaciones/taza.jpg" },
  { id: "bolsa", etapa: "oscuro", dato: { valor: "48", unidad: "h" }, imagen: "/estaciones/bolsa.jpg" },
];
