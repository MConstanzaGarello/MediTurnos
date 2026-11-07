import type { AuthenticatedMedico } from "@/lib/types/medico";

export interface AuthenticatedPatient {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  createdAt: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export class LoginError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LoginError";
    this.status = status;
  }
}

/**
 * Login ÚNICO de pacientes y médicos (HU-02 + Portal del Médico).
 * El backend devuelve:
 * - 404 -> "El usuario no se encuentra registrado."
 * - 401 -> "Correo electrónico o contraseña incorrectos."
 * - 200 -> `rol` ("paciente" | "medico"), los datos públicos (nunca la
 *   contraseña) y un JWT que identifica la sesión. Según el rol, la
 *   pantalla guarda la sesión de paciente (lib/auth/session.ts) o la de
 *   médico (lib/auth/medicoSession.ts) y lleva a su vista.
 */
export type LoginResult =
  | { rol: "paciente"; paciente: AuthenticatedPatient; token: string }
  | { rol: "medico"; medico: AuthenticatedMedico; token: string };

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LoginError(
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
    const body = (payload ?? {}) as { message?: string };
    throw new LoginError(
      response.status,
      body.message ?? "Ocurrió un error al iniciar sesión."
    );
  }

  const body = (payload ?? {}) as {
    rol?: string;
    paciente?: AuthenticatedPatient;
    medico?: AuthenticatedMedico;
    token?: string;
  };

  if (body.token && body.rol === "medico" && body.medico) {
    return { rol: "medico", medico: body.medico, token: body.token };
  }
  if (body.token && body.rol === "paciente" && body.paciente) {
    return { rol: "paciente", paciente: body.paciente, token: body.token };
  }

  throw new LoginError(response.status, "Respuesta inesperada del servidor.");
}
