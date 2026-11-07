import type { ActualizarPerfilInput } from "./medico.types";

export const MAX_DIAS_ATENCION = 150;
export const MAX_INFO = 255; // largo de la columna profesionales.info

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** true si es una fecha YYYY-MM-DD que existe en el calendario. */
export function esFechaValida(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/**
 * Valida el body de PATCH /api/medicos/perfil. Los dos campos son
 * obligatorios (no se puede dejar vacío cuándo atiende ni el detalle) y se
 * limitan al largo de su columna.
 */
export function validatePerfilInput(payload: unknown): {
  errors: Partial<Record<keyof ActualizarPerfilInput, string>>;
  data: ActualizarPerfilInput | null;
} {
  const errors: Partial<Record<keyof ActualizarPerfilInput, string>> = {};
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;

  const diasAtencion =
    typeof body.diasAtencion === "string" ? body.diasAtencion.trim() : "";
  const info = typeof body.info === "string" ? body.info.trim() : "";

  if (!diasAtencion) {
    errors.diasAtencion = "Ingrese los días de atención.";
  } else if (diasAtencion.length > MAX_DIAS_ATENCION) {
    errors.diasAtencion = `Los días de atención no pueden superar los ${MAX_DIAS_ATENCION} caracteres.`;
  }

  if (!info) {
    errors.info = "Ingrese el horario y detalle de atención.";
  } else if (info.length > MAX_INFO) {
    errors.info = `El horario y detalle no pueden superar los ${MAX_INFO} caracteres.`;
  }

  if (Object.keys(errors).length > 0) return { errors, data: null };
  return { errors, data: { diasAtencion, info } };
}
