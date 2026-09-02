import { and, asc, eq, lte, type SQL } from "drizzle-orm";
import { db } from "../db/client.ts";
import { granos, productos } from "../db/schema.ts";
import type { Categoria, Perfil, Proceso } from "../dominio.ts";

/**
 * La otra mitad de lo que sabe Brumita: la carta y el catálogo de grano.
 *
 * Esto **no** pasa por el retrieval vectorial. Un precio se responde exacto o no
 * se responde, y un precio embebido en un vector es un precio que se contesta
 * mal. Son consultas SQL con filtros tipados.
 *
 * El modelo nunca escribe SQL: elige una de estas funciones y le pasa
 * argumentos, que en la capa de tools valida Zod. No hay SQL generado, así que
 * no hay superficie de inyección — no hace falta una lista negra de palabras
 * prohibidas, porque no hay nada que filtrar.
 */

/** Los precios se guardan en centavos y se conversan en pesos. */
const aPesos = (centavos: number) => centavos / 100;

export type ProductoDeCarta = {
  nombre: string;
  categoria: string;
  precio: number;
  descripcion: string | null;
  disponible: boolean;
};

export async function buscarProductos({
  categoria,
  precioMaximo,
  soloDisponibles = true,
}: {
  // El `| undefined` explícito es por exactOptionalPropertyTypes: la capa de
  // tools arma estos objetos con las claves siempre presentes, y acá undefined
  // significa exactamente lo mismo que ausente — no filtrar por eso.
  categoria?: Categoria | undefined;
  /** En pesos, como lo diría una persona. */
  precioMaximo?: number | undefined;
  soloDisponibles?: boolean | undefined;
} = {}): Promise<ProductoDeCarta[]> {
  const filtros: SQL[] = [];

  if (categoria) filtros.push(eq(productos.categoria, categoria));
  if (precioMaximo !== undefined) filtros.push(lte(productos.precio, precioMaximo * 100));
  if (soloDisponibles) filtros.push(eq(productos.disponible, true));

  const filas = await db
    .select({
      nombre: productos.nombre,
      categoria: productos.categoria,
      precio: productos.precio,
      descripcion: productos.descripcion,
      disponible: productos.disponible,
    })
    .from(productos)
    .where(filtros.length > 0 ? and(...filtros) : undefined)
    .orderBy(asc(productos.precio));

  return filas.map((f) => ({ ...f, precio: aPesos(f.precio) }));
}

export type GranoDeCatalogo = {
  nombre: string;
  origen: string;
  proceso: string;
  perfil: string;
  altura: number | null;
  precio: number;
  stock: boolean;
};

/**
 * Los atributos exactos de cada origen: para filtrar y comparar.
 *
 * Devuelve todo menos la `ficha`. Esa es prosa larga y se llega a ella por
 * `buscarEnFichas`, que trae el pedazo que responde la pregunta en vez de los
 * 1.800 caracteres enteros.
 */
export async function verGranos({
  proceso,
  perfil,
  precioMaximo,
  soloConStock = false,
}: {
  proceso?: Proceso | undefined;
  perfil?: Perfil | undefined;
  precioMaximo?: number | undefined;
  soloConStock?: boolean | undefined;
} = {}): Promise<GranoDeCatalogo[]> {
  const filtros: SQL[] = [];

  if (proceso) filtros.push(eq(granos.proceso, proceso));
  if (perfil) filtros.push(eq(granos.perfil, perfil));
  if (precioMaximo !== undefined) filtros.push(lte(granos.precio, precioMaximo * 100));
  if (soloConStock) filtros.push(eq(granos.stock, true));

  const filas = await db
    .select({
      nombre: granos.nombre,
      origen: granos.origen,
      proceso: granos.proceso,
      perfil: granos.perfil,
      altura: granos.altura,
      precio: granos.precio,
      stock: granos.stock,
    })
    .from(granos)
    .where(filtros.length > 0 ? and(...filtros) : undefined)
    .orderBy(asc(granos.precio));

  return filas.map((f) => ({ ...f, precio: aPesos(f.precio) }));
}

/**
 * Lo único que no sale de la base.
 *
 * Es una sola fila que no cambia, y una tabla para una fila es una tabla que
 * alguien va a tener que mantener sin razón.
 *
 * Sigue habiendo una copia en el diccionario del front, porque las dos apps son
 * independientes y no comparten un paquete. Lo que impide que se separen no es
 * la disciplina de nadie: `tests/datos-maestros.test.ts` lee el diccionario del
 * front y falla si la dirección o el horario no coinciden con lo de acá. Es el
 * mismo mecanismo con el que ya se cuidaban los precios de la carta.
 */
export function horariosYUbicacion() {
  return {
    direccion: "Cabrera 4680, Palermo, Buenos Aires",
    horario: "Todos los días de 7:30 a 20:00",
    mesas: 12,
    wifi: true,
    // Lo que el local NO hace viaja acá y no en el prompt: son reglas del
    // negocio, no del personaje, y el modelo tiene que poder citarlas como
    // cita un precio.
    notas: "Se compra en el mostrador. No hay venta online ni envíos, no se reservan mesas y no hay cuentas de usuario.",
  };
}
