import type {
  ApiErrorResponse,
  Especialidad,
  HorarioDisponibilidad,
  MiTurno,
  Profesional,
  TurnoCreateErrors,
  TurnoCreatePayload,
  TurnoResponse,
} from "@/lib/types/turno";
import { getToken } from "@/lib/auth/session";
import { MENSAJE_ERROR_TURNOS } from "@/lib/turnos/misTurnos";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export class TurnoRequestError extends Error {
  status: number;
  errors?: TurnoCreateErrors;

  constructor(status: number, message: string, errors?: TurnoCreateErrors) {
    super(message);
    this.name = "TurnoRequestError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getEspecialidades(): Promise<Especialidad[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/especialidades`);
  } catch {
    throw new TurnoRequestError(
      0,
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
    );
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new TurnoRequestError(
      response.status,
      body.message ?? "No se pudo obtener el listado de especialidades."
    );
  }

  const body = (payload ?? {}) as { especialidades?: Especialidad[] };
  return body.especialidades ?? [];
}

export async function getProfesionales(
  especialidadId: number
): Promise<Profesional[]> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/profesionales?especialidadId=${especialidadId}`
    );
  } catch {
    throw new TurnoRequestError(
      0,
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
    );
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new TurnoRequestError(
      response.status,
      body.message ?? "No se pudo obtener el listado de profesionales."
    );
  }

  const body = (payload ?? {}) as { profesionales?: Profesional[] };
  return body.profesionales ?? [];
}

export async function getHorariosDisponibilidad(
  profesionalId: number,
  fecha: string
): Promise<HorarioDisponibilidad[]> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/turnos/horarios-disponibles?profesionalId=${profesionalId}&fecha=${fecha}`
    );
  } catch {
    throw new TurnoRequestError(
      0,
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
    );
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new TurnoRequestError(
      response.status,
      body.message ?? "No se pudo obtener la disponibilidad de horarios."
    );
  }

  const body = (payload ?? {}) as { horarios?: HorarioDisponibilidad[] };
  return body.horarios ?? [];
}

/**
 * Envía la solicitud de turno al backend real, autenticada con el JWT de
 * la sesión (ver lib/auth/session.ts). El backend saca el pacienteId del
 * token: acá ya no se manda ningún dato de identidad en el body.
 *
 * Si no hay sesión (token ausente), directamente no se intenta la
 * request: el backend la rechazaría igual con 401, pero evitamos el
 * viaje de red innecesario.
 */
export async function createTurno(
  data: TurnoCreatePayload
): Promise<TurnoResponse> {
  const token = getToken();
  if (!token) {
    throw new TurnoRequestError(401, "Debe iniciar sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/turnos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new TurnoRequestError(
      0,
      "No fue posible solicitar el turno. Intente nuevamente."
    );
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new TurnoRequestError(
      response.status,
      body.message ?? "No fue posible solicitar el turno. Intente nuevamente.",
      body.errors
    );
  }

  const body = (payload ?? {}) as { turno?: TurnoResponse };
  if (!body.turno) {
    throw new TurnoRequestError(
      response.status,
      "No fue posible solicitar el turno. Intente nuevamente."
    );
  }

  return body.turno;
}

/**
 * HU-04 — Consultar mis turnos.
 *
 * Pide al backend los turnos del paciente logueado, autenticado con el
 * JWT de la sesión. El backend saca el paciente del token, así que acá no
 * se manda ningún id.
 *
 * - Sin sesión -> TurnoRequestError 401 (la pantalla redirige al login).
 * - Error de red o del servidor -> TurnoRequestError con el mensaje del
 *   criterio de aceptación: "No fue posible obtener los turnos."
 * - Sin turnos -> lista vacía (la pantalla muestra "No posee turnos
 *   programados.").
 */
export async function getMisTurnos(): Promise<MiTurno[]> {
  const token = getToken();
  if (!token) {
    throw new TurnoRequestError(401, "Debe iniciar sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/turnos/mis-turnos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new TurnoRequestError(0, MENSAJE_ERROR_TURNOS);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new TurnoRequestError(
      response.status,
      response.status === 401
        ? body.message ?? "Debe iniciar sesión para continuar."
        : MENSAJE_ERROR_TURNOS
    );
  }

  const body = (payload ?? {}) as { turnos?: MiTurno[] };
  if (!Array.isArray(body.turnos)) {
    throw new TurnoRequestError(response.status, MENSAJE_ERROR_TURNOS);
  }

  return body.turnos;
}
