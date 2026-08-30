import { Paciente } from "../../db/models/Paciente";
import { comparePassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
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
 *   (nunca la contraseña) para que el frontend redirija y muestre su nombre.
 */
export async function loginPatient(input: LoginInput): Promise<PublicPatient> {
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

  return toPublicPatient(paciente);
}