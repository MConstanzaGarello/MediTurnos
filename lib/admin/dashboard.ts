import type { EstadoTurnoAdmin, TurnoDashboard } from "@/lib/types/admin";

/** Mensajes del dashboard administrativo (HU-11). */
export const MENSAJE_SIN_TURNOS_HOY = "No hay turnos programados para hoy.";
export const MENSAJE_SIN_COINCIDENCIAS = "No hay turnos que coincidan con la búsqueda.";
export const MENSAJE_ERROR_DASHBOARD = "No fue posible obtener la información del dashboard.";

export type FiltroEstado = "todos" | EstadoTurnoAdmin;

export const FILTROS: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "confirmado", etiqueta: "Confirmados" },
  { valor: "cancelado", etiqueta: "Cancelados" },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtra los turnos de hoy por estado y por texto (paciente, DNI, profesional
 * o especialidad), sin distinguir mayúsculas ni tildes.
 */
export function filtrarTurnos(
  turnos: TurnoDashboard[],
  filtro: FiltroEstado,
  busqueda: string
): TurnoDashboard[] {
  const texto = normalizar(busqueda);

  return turnos.filter((t) => {
    if (filtro !== "todos" && t.estado !== filtro) return false;
    if (!texto) return true;
    return normalizar(`${t.paciente} ${t.dni} ${t.profesional} ${t.especialidad}`).includes(texto);
  });
}

/** "2026-11-05" -> "jueves, 5 de noviembre de 2026" */
export function formatearFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
