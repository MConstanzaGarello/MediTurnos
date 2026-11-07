import { Especialidad, Paciente, Profesional } from "../../db/models";
import { comparePassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
import { signDoctorToken, signSessionToken } from "../../utils/jwt";
import type { LoginInput, LoginResult } from "./auth.types";
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

export const MENSAJE_USUARIO_NO_REGISTRADO =
  "El usuario no se encuentra registrado.";
export const MENSAJE_CREDENCIALES_INCORRECTAS =
  "Correo electrónico o contraseña incorrectos.";

/**
 * Inicio de sesión ÚNICO para pacientes y médicos (HU-02 + Portal del Médico).
 *
 * Con el mismo correo y contraseña entra cualquiera de los dos; la respuesta
 * trae `rol` ("paciente" o "medico") para que el frontend sepa a qué vista
 * llevarlo. Los médicos no se registran solos (los da de alta un
 * Administrativo), así que solo se buscan por las credenciales ya cargadas.
 *
 * Criterios de HU-02, que se mantienen:
 * - Correo que no existe ni como paciente ni como médico -> 404
 *   "El usuario no se encuentra registrado."
 * - Correo existente con contraseña incorrecta -> 401
 *   "Correo electrónico o contraseña incorrectos."
 * - Credenciales correctas -> datos públicos (nunca la contraseña) + JWT.
 *   El JWT es de paciente o de médico según el rol, y cada uno solo sirve en
 *   sus propias rutas.
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.toLowerCase();

  const paciente = await Paciente.findOne({ where: { email } });

  if (paciente && (await comparePassword(input.password, paciente.password))) {
    const token = signSessionToken({
      pacienteId: paciente.id,
      email: paciente.email,
    });
    return { rol: "paciente", paciente: toPublicPatient(paciente), token };
  }

  const profesional = await Profesional.findOne({
    where: { email },
    include: [{ model: Especialidad, attributes: ["id", "nombre"] }],
  });

  // Un profesional sin credenciales cargadas (email/password NULL) no puede
  // iniciar sesión: se lo trata como si el correo no fuera de un médico.
  const tieneCredenciales = Boolean(
    profesional && profesional.email && profesional.password
  );

  if (
    profesional &&
    profesional.email &&
    profesional.password &&
    (await comparePassword(input.password, profesional.password))
  ) {
    const token = signDoctorToken({
      profesionalId: profesional.id,
      email: profesional.email,
    });
    return {
      rol: "medico",
      medico: {
        id: profesional.id,
        nombre: profesional.nombre,
        email: profesional.email,
        especialidad: profesional.Especialidad?.nombre ?? "",
      },
      token,
    };
  }

  if (paciente || tieneCredenciales) {
    throw HttpError.unauthorized(MENSAJE_CREDENCIALES_INCORRECTAS);
  }

  throw HttpError.notFound(MENSAJE_USUARIO_NO_REGISTRADO);
}
