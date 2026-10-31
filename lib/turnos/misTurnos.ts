/**
 * HU-04 — Consultar mis turnos.
 *
 * Lógica pura (sin React ni fetch) de la pantalla "Mis turnos": mensajes
 * de los criterios de aceptación, orden, separación por pestañas y
 * formateo. Está separada para poder probarla con pruebas unitarias
 * (ver lib/turnos/misTurnos.test.ts).
 */

import type { EstadoTurno, MiTurno } from "@/lib/types/turno";

/** Criterio HU-04: "Si el paciente no posee turnos registrados". */
export const MENSAJE_SIN_TURNOS = "No posee turnos programados.";

/** Criterio HU-04: "Si ocurre un error al consultar la información". */
export const MENSAJE_ERROR_TURNOS = "No fue posible obtener los turnos.";

export const MENSAJE_SIN_CANCELADOS = "No posee turnos cancelados.";

export type PestanaTurnos = "proximos" | "cancelados";

export const PESTANAS: { id: PestanaTurnos; label: string }[] = [
  { id: "proximos", label: "Próximos" },
  { id: "cancelados", label: "Cancelados" },
];

export const ETIQUETA_ESTADO: Record<EstadoTurno, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

const MESES_CORTOS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

/** Fecha de hoy en formato YYYY-MM-DD, según la hora local del navegador. */
export function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ordena por fecha y hora ascendente (criterio: "Los turnos deberán
 * mostrarse ordenados por fecha"). No modifica el arreglo recibido.
 * Las fechas YYYY-MM-DD y horas HH:MM se pueden comparar como texto.
 */
export function ordenarTurnos(turnos: MiTurno[]): MiTurno[] {
  return [...turnos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
    return a.id - b.id;
  });
}

/**
 * Separa los turnos en las pestañas de la pantalla, ya ordenados:
 * - Próximos: confirmados de hoy en adelante (los turnos programados).
 * - Cancelados: los que el paciente canceló (HU-05), de cualquier fecha.
 *
 * Los confirmados con fecha pasada no se muestran acá: corresponden al
 * Historial de turnos (HU-07).
 */
export function clasificarTurnos(
  turnos: MiTurno[],
  hoy: string = hoyISO()
): Record<PestanaTurnos, MiTurno[]> {
  const ordenados = ordenarTurnos(turnos);
  return {
    proximos: ordenados.filter((t) => t.estado === "confirmado" && t.fecha >= hoy),
    cancelados: ordenados.filter((t) => t.estado === "cancelado"),
  };
}

/** Mensaje a mostrar cuando una pestaña no tiene turnos. */
export function mensajeSinTurnos(pestana: PestanaTurnos): string {
  return pestana === "proximos" ? MENSAJE_SIN_TURNOS : MENSAJE_SIN_CANCELADOS;
}

/** "2026-10-14" -> "14/10/2026" (sin pasar por Date, para evitar corrimientos de zona horaria). */
export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-10-14" -> { dia: "14", mes: "OCT" } para el recuadro de la tarjeta. */
export function partesFecha(fecha: string): { dia: string; mes: string } {
  const [, m, d] = fecha.split("-");
  return { dia: String(Number(d)), mes: MESES_CORTOS[Number(m) - 1] ?? "" };
}

/**
 * Saca el consultorio del texto libre del profesional
 * ("Atiende lunes... Consultorio N° 7." -> "Consultorio N° 7").
 * Devuelve null si el texto no lo menciona.
 */
export function extraerConsultorio(info: string): string | null {
  const match = info.match(/Consultorio\s+N°\s*\d+/i);
  return match ? match[0] : null;
}
