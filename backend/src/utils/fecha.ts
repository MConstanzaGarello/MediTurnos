/**
 * Fechas "de calendario" en horario de Argentina (UTC-3, sin horario de
 * verano). Se usan para saber qué es "hoy" y "este mes" para el administrador
 * sin depender de la zona horaria del servidor (que suele ser UTC y, después
 * de las 21 hs argentinas, ya marcaría el día siguiente).
 */
const OFFSET_ARGENTINA_MS = 3 * 60 * 60 * 1000;

/** Fecha de hoy en Argentina, formato YYYY-MM-DD. */
export function fechaHoyArgentina(ahora: number = Date.now()): string {
  return new Date(ahora - OFFSET_ARGENTINA_MS).toISOString().slice(0, 10);
}

/** Mes actual en Argentina, formato YYYY-MM. */
export function mesActualArgentina(ahora: number = Date.now()): string {
  return fechaHoyArgentina(ahora).slice(0, 7);
}

/** Devuelve [primer día del mes, primer día del mes siguiente) de un YYYY-MM. */
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [anio, nroMes] = mes.split("-").map(Number);
  const siguiente = nroMes === 12 ? `${anio + 1}-01` : `${anio}-${String(nroMes + 1).padStart(2, "0")}`;
  return { desde: `${mes}-01`, hasta: `${siguiente}-01` };
}
