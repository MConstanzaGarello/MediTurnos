import type { NextFunction, Request, Response } from "express";
import { validatePatientRegisterInput } from "./paciente.validator";
import { registerPatient } from "./paciente.service";
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
