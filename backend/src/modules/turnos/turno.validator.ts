import type { TurnoCreateErrors, TurnoCreateInput } from "./turno.types";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isFechaPasada(fecha: string): boolean {
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  const candidata = new Date(`${fecha}T00:00:00Z`);
  return candidata.getTime() < hoy.getTime();
}

/**
 * Validación en el backend para HU-03 (solicitar turno). Los mensajes son
 * exactamente los definidos en la consigna de HU-03 ("Si existen campos
 * incompletos"), y no se confía en las validaciones del frontend.
 *
 * OJO: acá NO se valida ni se recibe pacienteId — ese dato sale del JWT
 * verificado por el middleware requireAuth, nunca del body de la request.
 */
export function validateTurnoCreateInput(payload: unknown): {
  errors: TurnoCreateErrors;
  data: TurnoCreateInput | null;
} {
  const errors: TurnoCreateErrors = {};
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;

  const especialidadId = Number(body.especialidadId);
  const profesionalId = Number(body.profesionalId);
  const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
  const hora = typeof body.hora === "string" ? body.hora.trim() : "";

  if (!body.especialidadId || Number.isNaN(especialidadId)) {
    errors.especialidad = "Seleccione una especialidad.";
  }

  if (!body.profesionalId || Number.isNaN(profesionalId)) {
    errors.profesional = "Seleccione un profesional.";
  }

  if (!fecha) {
    errors.fecha = "Seleccione una fecha.";
  } else if (!FECHA_REGEX.test(fecha) || Number.isNaN(new Date(fecha).getTime())) {
    errors.fecha = "Seleccione una fecha.";
  } else if (isFechaPasada(fecha)) {
    // No permitir turnos con fecha anterior al día actual.
    errors.fecha = "Seleccione una fecha.";
  }

  if (!hora) {
    errors.hora = "Seleccione un horario disponible.";
  } else if (!HORA_REGEX.test(hora)) {
    errors.hora = "Seleccione un horario disponible.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, data: null };
  }

  return {
    errors,
    data: { especialidadId, profesionalId, fecha, hora },
  };
}

export interface TurnoReprogramarInput {
  fecha: string;
  hora: string;
}

export function validateTurnoReprogramarInput(payload: unknown): {
  errors: Partial<Record<"fecha" | "hora", string>>;
  data: TurnoReprogramarInput | null;
} {
  const errors: Partial<Record<"fecha" | "hora", string>> = {};
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
  const hora = typeof body.hora === "string" ? body.hora.trim() : "";

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    errors.fecha = "Seleccione una fecha válida.";
  } else if (new Date(`${fecha}T00:00:00Z`).getTime() < new Date().setUTCHours(0, 0, 0, 0)) {
    errors.fecha = "Seleccione una fecha futura.";
  }

  if (!hora || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    errors.hora = "Seleccione un horario disponible.";
  }

  if (Object.keys(errors).length > 0) return { errors, data: null };
  return { errors, data: { fecha, hora } };
}
