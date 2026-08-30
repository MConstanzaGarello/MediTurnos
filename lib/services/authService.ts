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
 * HU-02: envía el login al backend real.
 * El backend devuelve:
 * - 404 -> "El usuario no se encuentra registrado."
 * - 401 -> "Correo electrónico o contraseña incorrectos."
 * - 200 -> datos públicos del paciente (nunca la contraseña).
 */
export async function loginPatient(
  email: string,
  password: string
): Promise<AuthenticatedPatient> {
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

  const body = (payload ?? {}) as { paciente?: AuthenticatedPatient };
  if (!body.paciente) {
    throw new LoginError(response.status, "Respuesta inesperada del servidor.");
  }

  return body.paciente;
}