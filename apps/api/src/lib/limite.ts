import type { NextFunction, Request, Response } from "express";

/**
 * Límite de pedidos por IP.
 *
 * No es una defensa contra un atacante decidido —una IP se rota— sino contra lo
 * que de verdad va a pasar: una pestaña abierta mandando preguntas en loop, o
 * alguien probando el chat cien veces seguidas. Sin esto, la cuota gratuita de
 * Gemini se agota en una tarde y el sitio queda roto para todos los demás.
 *
 * Es una ventana fija en memoria, y eso es una decisión, no una simplificación
 * pendiente: el proceso es uno solo, un Map de unas pocas entradas es exacto y
 * cuesta nada, y meter Redis para esto sería agregar una pieza que puede
 * caerse a un sistema que sin ella no se cae. Si algún día hay más de una
 * instancia, el contador pasa a estar por instancia y el límite efectivo se
 * multiplica por la cantidad — que es un problema real, pero de ese día.
 */

type Ventana = { desde: number; usados: number };

export type OpcionesLimite = {
  /** Cuántos pedidos entran en cada ventana. */
  maximo: number;
  /** Cuánto dura la ventana, en milisegundos. */
  ventanaMs: number;
};

export function limitarPorIp({ maximo, ventanaMs }: OpcionesLimite) {
  const ventanas = new Map<string, Ventana>();

  return function limite(req: Request, res: Response, next: NextFunction) {
    const ahora = Date.now();
    // req.ip respeta trust proxy, que app.ts configura en produccion: sin eso,
    // detras de un proxy todas las visitas comparten la IP del proxy y el
    // limite lo paga el primero que pregunta.
    const clave = req.ip ?? "desconocida";

    // La limpieza va acá y no en un setInterval: un timer mantiene vivo el
    // event loop y complica apagar el proceso, y a esta escala recorrer el Map
    // cuando entra un pedido es gratis.
    for (const [ip, ventana] of ventanas) {
      if (ahora - ventana.desde >= ventanaMs) ventanas.delete(ip);
    }

    const ventana = ventanas.get(clave);

    if (!ventana) {
      ventanas.set(clave, { desde: ahora, usados: 1 });
      return next();
    }

    if (ventana.usados < maximo) {
      ventana.usados += 1;
      return next();
    }

    const faltan = Math.ceil((ventana.desde + ventanaMs - ahora) / 1000);
    res.setHeader("Retry-After", String(faltan));
    res.status(429).json({
      error: `Demasiadas preguntas seguidas. Probá de nuevo en ${faltan} segundos.`,
    });
  };
}
