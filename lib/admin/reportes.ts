/** Utilidades de la pantalla de reportes (HU-12). */

export const MENSAJE_SIN_DATOS_REPORTE = "No hay datos para el período seleccionado.";
export const MENSAJE_ERROR_REPORTE = "No fue posible obtener el reporte.";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-11" -> "Noviembre 2026" */
export function etiquetaMes(mes: string): string {
  const [anio, nroMes] = mes.split("-").map(Number);
  return `${MESES[nroMes - 1]} ${anio}`;
}

/**
 * Lista de meses para el selector: el mes indicado y los `cantidad - 1`
 * anteriores, del más nuevo al más viejo (ej: 2026-11, 2026-10, ...).
 */
export function mesesParaSelector(mesActual: string, cantidad = 12): string[] {
  let [anio, nroMes] = mesActual.split("-").map(Number);
  const meses: string[] = [];

  for (let i = 0; i < cantidad; i++) {
    meses.push(`${anio}-${String(nroMes).padStart(2, "0")}`);
    nroMes -= 1;
    if (nroMes === 0) {
      nroMes = 12;
      anio -= 1;
    }
  }
  return meses;
}

/** Mes actual (YYYY-MM) según la fecha local del navegador. */
export function mesActualLocal(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}

/** Ancho de una barra como porcentaje del valor máximo (0 si no hay datos). */
export function porcentajeDelMaximo(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.round((valor / maximo) * 100);
}
