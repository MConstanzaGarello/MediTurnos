import { Op, UniqueConstraintError } from "sequelize";
import { Paciente } from "../../db/models/Paciente";
import { hashPassword } from "../../utils/password";
import { HttpError } from "../../utils/httpError";
import type { PatientRegisterInput, PublicPatient } from "./paciente.types";

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
 * Registra un paciente nuevo.
 * 1. Verifica que el DNI no exista.
 * 2. Verifica que el email no exista.
 * 3. Hashea la contraseña (nunca se guarda en texto plano).
 * 4. Persiste en PostgreSQL.
 *
 * También confía en las restricciones UNIQUE de la base de datos como
 * segunda barrera ante condiciones de carrera (dos registros simultáneos
 * con el mismo DNI/email).
 */
export async function registerPatient(
  input: PatientRegisterInput
): Promise<PublicPatient> {
  const existing = await Paciente.findOne({
    where: {
      [Op.or]: [{ dni: input.dni }, { email: input.email.toLowerCase() }],
    },
  });

  if (existing) {
    if (existing.dni === input.dni) {
      throw HttpError.conflict("Este DNI ya se encuentra registrado.", {
        dni: "Este DNI ya se encuentra registrado.",
      });
    }
    throw HttpError.conflict("Este correo ya se encuentra registrado.", {
      email: "Este correo ya se encuentra registrado.",
    });
  }

  const hashedPassword = await hashPassword(input.password);

  try {
    const paciente = await Paciente.create({
      nombre: input.nombre,
      apellido: input.apellido,
      dni: input.dni,
      fechaNacimiento: input.fechaNacimiento,
      email: input.email.toLowerCase(),
      telefono: input.telefono,
      password: hashedPassword,
    });

    return toPublicPatient(paciente);
  } catch (error) {
    // Red de seguridad ante una condición de carrera que haya esquivado
    // el chequeo de arriba: la restricción UNIQUE de la base de datos
    // rechaza el insert y lo traducimos a un 409 legible.
    if (error instanceof UniqueConstraintError) {
      const field = error.errors?.[0]?.path;
      if (field === "dni") {
        throw HttpError.conflict("Este DNI ya se encuentra registrado.", {
          dni: "Este DNI ya se encuentra registrado.",
        });
      }
      if (field === "email") {
        throw HttpError.conflict("Este correo ya se encuentra registrado.", {
          email: "Este correo ya se encuentra registrado.",
        });
      }
      throw HttpError.conflict(
        "El DNI o el correo ya se encuentran registrados."
      );
    }
    throw error;
  }
}
