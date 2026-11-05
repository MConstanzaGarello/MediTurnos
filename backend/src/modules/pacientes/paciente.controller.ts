import type { NextFunction, Request, Response } from "express";
import {
  validatePatientRegisterInput,
  validatePatientProfileUpdateInput,
} from "./paciente.validator";
import {
  registerPatient,
  getPerfilPaciente,
  updatePerfilPaciente,
} from "./paciente.service";
import { HttpError } from "../../utils/httpError";

/**
 * POST /api/pacientes/registro
 *
 * Flujo:
 * 1. Valida el payload (sin confiar en el frontend).
 * 2. Si hay errores de formato -> 400 con detalle por campo.
 * 3. Delega en el service, que verifica DNI/email únicos y guarda.
 * 4. Devuelve 201 con el paciente creado (sin password).
 */
export async function registerPatientHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { errors, data } = validatePatientRegisterInput(req.body);

    if (Object.keys(errors).length > 0) {
      throw HttpError.badRequest("Datos inválidos.", errors);
    }

    const paciente = await registerPatient(data);
    res.status(201).json({
      message: "Paciente registrado correctamente.",
      paciente,
    });
  } catch (error) {
    next(error);
  }
}
/**
 * HU-08 — GET /api/pacientes/perfil
 * Consulta los datos del paciente autenticado.
 */
export async function getPerfilPacienteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.pacienteId === undefined) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const paciente = await getPerfilPaciente(req.pacienteId);

    res.status(200).json({ paciente });
  } catch (error) {
    next(error);
  }
}

/**
 * HU-08 — PUT /api/pacientes/perfil
 * Actualiza los datos personales del paciente autenticado.
 */
export async function updatePerfilPacienteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.pacienteId === undefined) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const { errors, data } = validatePatientProfileUpdateInput(req.body);

    if (Object.keys(errors).length > 0 || !data) {
      throw HttpError.badRequest(
  "Datos inválidos.",
  errors as Partial<Record<string, string>>
);
    }

    const paciente = await updatePerfilPaciente(req.pacienteId, data);

    res.status(200).json({
      message: "Perfil actualizado correctamente.",
      paciente,
    });
  } catch (error) {
    next(error);
  }
}