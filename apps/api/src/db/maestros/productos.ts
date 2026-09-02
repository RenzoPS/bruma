import type { productos } from "../schema.ts";

/**
 * La carta del local. Esto NO son datos de prueba: es el sistema. Si la tabla
 * esta vacia, Brumita no tiene con que responder cuando le preguntan un precio.
 *
 * Por eso vive en un archivo que se lee de arriba a abajo y no repartido en
 * migraciones: el estado actual de la carta tiene que poder leerse de una,
 * sin reconstruirlo mentalmente aplicando parches en orden. Corregir un precio
 * es cambiar un numero aca y volver a aplicar los datos maestros.
 *
 * Las `clave` son las mismas de apps/web/src/lib/carta.ts a proposito. Es lo
 * que permite verificar que la base y el front no divirtieron: si el front
 * muestra un producto que la base no tiene, Brumita no lo sabe vender.
 */
export const PRODUCTOS: (typeof productos.$inferInsert)[] = [
  // --- Cafe ---
  {
    clave: "espresso",
    nombre: "Espresso",
    categoria: "cafe",
    precio: 320000,
    descripcion: "18 g en 36 g, 25 segundos",
    disponible: true,
  },
  {
    clave: "cortado",
    nombre: "Cortado",
    categoria: "cafe",
    precio: 360000,
    descripcion: "Espresso con un toque de leche",
    disponible: true,
  },
  {
    clave: "flatWhite",
    nombre: "Flat white",
    categoria: "cafe",
    precio: 480000,
    descripcion: "El que más sale",
    disponible: true,
  },
  {
    clave: "v60",
    nombre: "Filtrado V60",
    categoria: "cafe",
    precio: 520000,
    descripcion: "Para el origen de la semana, en taza chica",
    disponible: true,
  },
  {
    clave: "coldBrew",
    nombre: "Cold brew",
    categoria: "cafe",
    precio: 540000,
    descripcion: "18 horas en frío",
    disponible: true,
  },

  // --- Para acompanar ---
  {
    clave: "medialuna",
    nombre: "Medialuna",
    categoria: "acompanar",
    precio: 140000,
    descripcion: "De manteca, glaseadas a la mañana",
    disponible: true,
  },
  {
    clave: "tostado",
    nombre: "Tostado de jamón y queso",
    categoria: "acompanar",
    precio: 680000,
    descripcion: "En pan de masa madre",
    disponible: true,
  },
  {
    clave: "budin",
    nombre: "Budín del día",
    categoria: "acompanar",
    precio: 390000,
    descripcion: "Hoy: limón y amapola",
    disponible: true,
  },
  {
    clave: "alfajor",
    nombre: "Alfajor de maicena",
    categoria: "acompanar",
    precio: 260000,
    descripcion: "Con dulce de leche y coco",
    disponible: true,
  },

  // --- Desayunos ---
  {
    clave: "desayunoBruma",
    nombre: "Desayuno BRUMA",
    categoria: "desayuno",
    precio: 980000,
    descripcion: "Café a elección, dos medialunas y jugo exprimido",
    disponible: true,
  },
  {
    clave: "desayunoCompleto",
    nombre: "Desayuno completo",
    categoria: "desayuno",
    precio: 1250000,
    descripcion: "Café a elección, tostado y jugo exprimido",
    disponible: true,
  },
  {
    clave: "promo",
    nombre: "Café + medialuna",
    categoria: "desayuno",
    precio: 490000,
    descripcion: "Antes de las 10, de lunes a viernes",
    disponible: true,
  },

  // --- Grano en bolsa ---
  // La bolsa de 250 g de cada origen. La ficha larga vive en `granos`: aca solo
  // esta lo que se responde exacto, que es el precio de mostrador.
  {
    clave: "guji",
    nombre: "Guji, Etiopía",
    categoria: "grano",
    precio: 1800000,
    descripcion: "Lavado. Cítrico y floral, liviano en taza",
    disponible: true,
  },
  {
    clave: "huila",
    nombre: "Huila, Colombia",
    categoria: "grano",
    precio: 1550000,
    descripcion: "Lavado. Caramelo y naranja, equilibrado",
    disponible: true,
  },
  {
    clave: "cerrado",
    nombre: "Cerrado, Brasil",
    categoria: "grano",
    precio: 1450000,
    descripcion: "Natural. Chocolate y nuez, el que mejor aguanta la leche",
    disponible: true,
  },
  {
    clave: "narino",
    nombre: "Nariño, Colombia",
    categoria: "grano",
    precio: 1680000,
    descripcion: "Honey. Dulce, con cuerpo",
    // Agotado, igual que en el front. Brumita tiene que poder decir que no hay.
    disponible: false,
  },
];
