/**
 * HU-07 — Consultar historial de turnos.
 *
 * Lógica pura del historial, separada de la pantalla para poder probarla.
 * Complementa a clasificarTurnos (misTurnos.ts): ahí quedan los Próximos y
 * los Cancelados; acá, los turnos confirmados con fecha anterior a hoy.
 */

import type { MiTurno } from "@/lib/types/turno";
import { hoyISO, ordenarTurnos } from "@/lib/turnos/misTurnos";

/** Criterio HU-07: "Si el paciente no posee turnos en el historial". */
export const MENSAJE_SIN_HISTORIAL = "No posee turnos en el historial.";

/** Criterio HU-07: "Si ocurre un error al consultar la información". */
export const MENSAJE_ERROR_HISTORIAL =
  "No fue posible obtener el historial de turnos.";

/**
 * Turnos confirmados con fecha anterior a hoy, del más reciente al más
 * antiguo. No modifica el arreglo recibido.
 */
export function filtrarHistorial(
  turnos: MiTurno[],
  hoy: string = hoyISO()
): MiTurno[] {
  const pasados = turnos.filter(
    (t) => t.estado === "confirmado" && t.fecha < hoy
  );
  return ordenarTurnos(pasados).reverse();
}