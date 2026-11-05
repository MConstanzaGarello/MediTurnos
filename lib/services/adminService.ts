import { getToken } from "@/lib/auth/session";
import type {
  AltaMedicoErrors,
  AltaMedicoForm,
  DashboardAdmin,
  MedicoAdmin,
  ObraSocial,
  ReporteMensual,
} from "@/lib/types/admin";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export const MENSAJE_ERROR_CONEXION =
  "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.";

export class AdminRequestError extends Error {
  status: number;
  errors?: AltaMedicoErrors;

  constructor(status: number, message: string, errors?: AltaMedicoErrors) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
    this.errors = errors;
  }
}

/** Llama a /api/admin/... con el JWT de la sesión y devuelve el JSON. */
async function pedir<T>(
  ruta: string,
  opciones: { method?: string; body?: unknown } = {},
  mensajeError = "Ocurrió un error. Intente nuevamente."
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/admin${ruta}`, {
      method: opciones.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken() ?? ""}`,
      },
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });
  } catch {
    throw new AdminRequestError(0, MENSAJE_ERROR_CONEXION);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { message?: string; errors?: AltaMedicoErrors };
    throw new AdminRequestError(response.status, body.message ?? mensajeError, body.errors);
  }

  return payload as T;
}

/** HU-11: turnos de hoy e indicadores. */
export function getDashboard(): Promise<DashboardAdmin> {
  return pedir<DashboardAdmin>("/dashboard", {}, "No fue posible obtener el dashboard.");
}

export function getMedicos(): Promise<MedicoAdmin[]> {
  return pedir<MedicoAdmin[]>("/medicos", {}, "No fue posible obtener los médicos.");
}

export function getObrasSociales(): Promise<ObraSocial[]> {
  return pedir<ObraSocial[]>("/obras-sociales", {}, "No fue posible obtener las obras sociales.");
}

/** HU-11: alta de médico. */
export async function crearMedico(form: AltaMedicoForm): Promise<{ message: string; medico: MedicoAdmin }> {
  return pedir(
    "/medicos",
    {
      method: "POST",
      body: {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        matricula: form.matricula.trim(),
        email: form.email.trim(),
        especialidadId: Number(form.especialidadId),
        obrasSocialesIds: form.obrasSocialesIds,
        precioParticular: form.precioParticular.trim().replace(",", "."),
        passwordTemporal: form.passwordTemporal,
        ...(form.info.trim() ? { info: form.info.trim() } : {}),
      },
    },
    "No fue posible dar de alta al médico."
  );
}

/** HU-11: cambio de especialidad (solo administrador). */
export function cambiarEspecialidad(
  medicoId: number,
  especialidadId: number
): Promise<{ message: string; medico: MedicoAdmin }> {
  return pedir(
    `/medicos/${medicoId}/especialidad`,
    { method: "PATCH", body: { especialidadId } },
    "No fue posible cambiar la especialidad."
  );
}

/** HU-12: reporte estadístico de un mes (YYYY-MM). */
export function getReporte(mes: string): Promise<ReporteMensual> {
  return pedir<ReporteMensual>(
    `/reportes?mes=${encodeURIComponent(mes)}`,
    {},
    "No fue posible obtener el reporte."
  );
}
