import { Paciente } from "../../db/models/Paciente";
import { Administrador } from "../../db/models/Administrador";
import { Profesional } from "../../db/models/Profesional";
import { comparePassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
import { signSessionToken } from "../../utils/jwt";
import type { LoginInput } from "./auth.types";
import type { PublicPatient } from "../pacientes/paciente.types";

function toPublicPatient(paciente: Paciente): PublicPatient {
  return {
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: paciente.dni,
    fechaNacimiento: paciente.fechaNacimiento,
    email: paciente.email,
    telefono: paciente.telefono,
    createdAt: paciente.createdAt.toISOString(),
  };
}

/**
 * HU-02: Inicio de sesión. Sigue exactamente los criterios de aceptación:
 * - Cuenta inexistente -> "El usuario no se encuentra registrado."
 * - Contraseña incorrecta -> "Correo electrónico o contraseña incorrectos."
 * - Credenciales correctas -> devuelve los datos públicos del paciente
 *   (nunca la contraseña) más un JWT que identifica la sesión, para que
 *   HU-03 (y cualquier otra pantalla que necesite saber quién está
 *   logueado) lo pueda usar.
 */
export async function loginPatient(
  input: LoginInput
): Promise<{ paciente: PublicPatient; token: string }> {
  const paciente = await Paciente.findOne({
    where: { email: input.email.toLowerCase() },
  });

  if (!paciente) {
    throw HttpError.notFound("El usuario no se encuentra registrado.");
  }

  const passwordMatches = await comparePassword(
    input.password,
    paciente.password
  );

  if (!passwordMatches) {
    throw HttpError.unauthorized(
      "Correo electrónico o contraseña incorrectos."
    );
  }

  const token = signSessionToken({
    rol: "paciente",
    pacienteId: paciente.id,
    email: paciente.email,
  });

  return { paciente: toPublicPatient(paciente), token };
}

/** Datos públicos de un usuario del personal (administrador o médico). */
export interface PublicStaffUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export type LoginResult =
  | { rol: "paciente"; paciente: PublicPatient; token: string }
  | { rol: "admin"; admin: PublicStaffUser; token: string }
  | { rol: "medico"; medico: PublicStaffUser; token: string };

const MENSAJE_CREDENCIALES_INCORRECTAS =
  "Correo electrónico o contraseña incorrectos.";

/**
 * HU-02 + HU-11: inicio de sesión único para los tres roles.
 * Busca el correo primero entre administradores, después entre médicos
 * (los que ya tienen usuario, HU-11) y por último entre pacientes. El rol
 * viaja en el JWT y es lo que usan requireAuth/requireAdmin.
 * Los mensajes de error son los mismos de HU-02 en los tres casos.
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = input.email.toLowerCase();

  const admin = await Administrador.findOne({ where: { email } });
  if (admin) {
    if (!(await comparePassword(input.password, admin.password))) {
      throw HttpError.unauthorized(MENSAJE_CREDENCIALES_INCORRECTAS);
    }
    const token = signSessionToken({ rol: "admin", adminId: admin.id, email: admin.email });
    return {
      rol: "admin",
      admin: { id: admin.id, nombre: admin.nombre, apellido: admin.apellido, email: admin.email },
      token,
    };
  }

  const medico = await Profesional.findOne({ where: { email } });
  if (medico && medico.password && medico.email) {
    if (!(await comparePassword(input.password, medico.password))) {
      throw HttpError.unauthorized(MENSAJE_CREDENCIALES_INCORRECTAS);
    }
    const token = signSessionToken({
      rol: "medico",
      profesionalId: medico.id,
      email: medico.email,
    });
    return {
      rol: "medico",
      medico: { id: medico.id, nombre: medico.nombre, apellido: "", email: medico.email },
      token,
    };
  }

  const { paciente, token } = await loginPatient(input);
  return { rol: "paciente", paciente, token };
}