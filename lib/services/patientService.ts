import type {
  ApiErrorResponse,
  PatientRegisterFormData,
  PatientResponse,
} from "@/lib/types/patient";
import { getToken } from "@/lib/auth/session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export class PatientRegisterError extends Error {
  status: number;
  errors?: ApiErrorResponse["errors"];

  constructor(status: number, message: string, errors?: ApiErrorResponse["errors"]) {
    super(message);
    this.name = "PatientRegisterError";
    this.status = status;
    this.errors = errors;
  }
}
export class PatientProfileRequestError extends Error {
  status: number;
  errors?: ApiErrorResponse["errors"];

  constructor(
    status: number,
    message: string,
    errors?: ApiErrorResponse["errors"]
  ) {
    super(message);
    this.name = "PatientProfileRequestError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Envía el formulario de registro al backend real.
 * Lanza `PatientRegisterError` con el status HTTP y, si el backend lo
 * proporciona, el detalle de errores por campo (400) o el mensaje de
 * conflicto (409 por DNI/email duplicado).
 */
export async function registerPatient(
  data: PatientRegisterFormData
): Promise<PatientResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/pacientes/registro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new PatientRegisterError(
      0,
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorResponse>;
    throw new PatientRegisterError(
      response.status,
      body.message ??
        "Ocurrió un error al registrar el paciente. Intentá nuevamente.",
      body.errors
    );
  }

  const body = (payload ?? {}) as { paciente?: PatientResponse };
  if (!body.paciente) {
    throw new PatientRegisterError(
      response.status,
      "Respuesta inesperada del servidor."
    );
  }

  return body.paciente;
}
export async function getPatientProfile(): Promise<PatientResponse> {
  const token = getToken();

  if (!token) {
    throw new PatientProfileRequestError(
      401,
      "Debe iniciar sesión para continuar."
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/pacientes/perfil`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new PatientProfileRequestError(
      0,
      "No fue posible obtener los datos del perfil."
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { paciente?: PatientResponse; message?: string }
    | null;

  if (!response.ok || !payload?.paciente) {
    throw new PatientProfileRequestError(
      response.status,
      payload?.message ?? "No fue posible obtener los datos del perfil."
    );
  }

  return payload.paciente;
}
export async function updatePatientProfile(data: {
  nombre: string;
  apellido: string;
  telefono: string;
  fechaNacimiento: string;
}): Promise<PatientResponse> {
  const token = getToken();

  if (!token) {
    throw new PatientProfileRequestError(
      401,
      "Debe iniciar sesión para continuar."
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/pacientes/perfil`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new PatientProfileRequestError(
      0,
      "No fue posible actualizar el perfil."
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        paciente?: PatientResponse;
        message?: string;
        errors?: ApiErrorResponse["errors"];
      }
    | null;

  if (!response.ok || !payload?.paciente) {
    throw new PatientProfileRequestError(
      response.status,
      payload?.message ?? "No fue posible actualizar el perfil.",
      payload?.errors
    );
  }

  return payload.paciente;
}