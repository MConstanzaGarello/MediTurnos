/**
 * Fecha de hoy en formato YYYY-MM-DD según la hora de Argentina (UTC-3),
 * no la del servidor (que suele estar en UTC). Misma convención que
 * turno.validator.ts y turno.cancelar.ts.
 */
export function hoyArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
