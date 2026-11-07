import type {
  ActualizarPerfilInput,
  DashboardMedico,
  EstadoAsignable,
  PacienteAtendido,
  PerfilMedico,
} from "@/lib/types/medico";
import type { EstadoTurno } from "@/lib/types/turno";
import { getMedicoToken } from "@/lib/auth/medicoSession";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

const MENSAJE_SIN_CONEXION =
  "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.";

/**
 * Error de cualquier pedido del Portal del Médico. `status` 0 = sin conexión;
 * 401 = sesión inválida o vencida (la pantalla debe cerrar la sesión).
 */
export class MedicoRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MedicoRequestError";
    this.status = status;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Hace un pedido a la API usando SIEMPRE el JWT del médico (clave de sesión
 * propia, ver lib/auth/medicoSession.ts) y devuelve el JSON ya parseado.
 */
async function medicoRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getMedicoToken();
  if (!token) {
    throw new MedicoRequestError(401, "Debe iniciar sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new MedicoRequestError(0, MENSAJE_SIN_CONEXION);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const body = (payload ?? {}) as { message?: string };
    throw new MedicoRequestError(
      response.status,
      body.message ?? "Ocurrió un error al procesar el pedido."
    );
  }

  return (payload ?? {}) as T;
}

/**
 * GET /api/medicos/dashboard[?fecha=YYYY-MM-DD]: métricas y turnos del día.
 * Sin fecha devuelve hoy; con fecha, un día anterior o próximo.
 */
export async function getDashboard(fecha?: string): Promise<DashboardMedico> {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return medicoRequest<DashboardMedico>(`/api/medicos/dashboard${query}`);
}

/** GET /api/medicos/pacientes: pacientes únicos atendidos. */
export async function getPacientes(): Promise<PacienteAtendido[]> {
  const body = await medicoRequest<{ pacientes?: PacienteAtendido[] }>(
    "/api/medicos/pacientes"
  );
  return body.pacientes ?? [];
}

/** GET /api/medicos/perfil: datos del médico autenticado. */
export async function getPerfil(): Promise<PerfilMedico> {
  const body = await medicoRequest<{ perfil?: PerfilMedico }>("/api/medicos/perfil");
  if (!body.perfil) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.perfil;
}

/** PATCH /api/medicos/perfil: edita días de atención y horario/detalle. */
export async function actualizarPerfil(
  input: ActualizarPerfilInput
): Promise<PerfilMedico> {
  const body = await medicoRequest<{ perfil?: PerfilMedico }>("/api/medicos/perfil", {
    method: "PATCH",
    body: input,
  });
  if (!body.perfil) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.perfil;
}

/** PUT /api/turnos/:id/reprogramar-medico: mueve un turno propio a otra fecha/hora. */
export async function reprogramarTurnoMedico(
  turnoId: number,
  fecha: string,
  hora: string
): Promise<{ id: number; fecha: string; hora: string; estado: EstadoTurno }> {
  const body = await medicoRequest<{
    turno?: { id: number; fecha: string; hora: string; estado: EstadoTurno };
  }>(`/api/turnos/${turnoId}/reprogramar-medico`, {
    method: "PUT",
    body: { fecha, hora },
  });
  if (!body.turno) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.turno;
}

/** PATCH /api/turnos/:id/estado: marca un turno propio como atendido/pendiente. */
export async function actualizarEstadoTurno(
  turnoId: number,
  estado: EstadoAsignable
): Promise<{ id: number; estado: EstadoTurno }> {
  const body = await medicoRequest<{ turno?: { id: number; estado: EstadoTurno } }>(
    `/api/turnos/${turnoId}/estado`,
    { method: "PATCH", body: { estado } }
  );
  if (!body.turno) {
    throw new MedicoRequestError(500, "Respuesta inesperada del servidor.");
  }
  return body.turno;
}
