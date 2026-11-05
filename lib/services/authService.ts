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

/** Rol con el que ingresó el usuario (HU-11). */
export type RolLogin = "paciente" | "admin" | "medico";

/** Resultado del login: el usuario con la forma mínima que guarda la sesión. */
export interface LoginResult {
  rol: RolLogin;
  token: string;
  usuario: { id: number; nombre: string; apellido: string; email: string };
}

export class LoginError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LoginError";
    this.status = status;
  }
}

/**
 * HU-02 + HU-11: envía el login al backend real (el mismo para paciente,
 * administrador y médico; el backend informa el rol).
 * El backend devuelve:
 * - 404 -> "El usuario no se encuentra registrado."
 * - 401 -> "Correo electrónico o contraseña incorrectos."
 * - 200 -> datos públicos del paciente (nunca la contraseña) + un JWT
 *   que identifica la sesión (ver lib/auth/session.ts para persistirlo).
 */
export async function loginUser(
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
    rol?: RolLogin;
    paciente?: AuthenticatedPatient;
    admin?: LoginResult["usuario"];
    medico?: LoginResult["usuario"];
    token?: string;
  };
  const rol = body.rol ?? "paciente";
  const usuario = rol === "admin" ? body.admin : rol === "medico" ? body.medico : body.paciente;
  if (!usuario || !body.token) {
    throw new LoginError(response.status, "Respuesta inesperada del servidor.");
  }

  return {
    rol,
    token: body.token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  };
}