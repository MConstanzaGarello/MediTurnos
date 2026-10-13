/**
 * Horarios posibles por día. Centralizado acá porque es el backend el
 * que decide la disponibilidad real (ver TODO histórico: antes esto
 * vivía como MOCK en el frontend).
 *
 * TODO: si en el futuro cada profesional tiene una grilla horaria propia
 * (en vez de una única lista fija para todos), esto se reemplaza por una
 * tabla "Agenda" por profesional. Por ahora, siguiendo el alcance
 * definido en la consigna de HU-03, alcanza con esta lista fija.
 */
export const HORARIOS_POSIBLES = [
  "08:00",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "16:00",
  "16:30",
];

/**
 * Estados posibles de un turno (HU-04 los muestra, HU-05 cancela).
 * Deben coincidir con el CHECK de la migración
 * 20261012000000-add-estado-to-turnos.
 */
export const ESTADOS_TURNO = ["confirmado", "cancelado"] as const;

export type EstadoTurno = (typeof ESTADOS_TURNO)[number];
