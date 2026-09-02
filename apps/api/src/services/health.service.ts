/**
 * El endpoint que pinguea el keep-alive del host para que no duerma el servicio.
 * Se mantiene barato a proposito: no toca la base ni la API de Gemini, porque
 * corre cada pocos minutos las veinticuatro horas.
 */
export function estadoDelProceso() {
  return {
    estado: "ok" as const,
    uptime: Math.floor(process.uptime()),
    entorno: process.env.NODE_ENV ?? "development",
  };
}
