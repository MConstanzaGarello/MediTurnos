import type { NextFunction, Request, Response } from "express";
import { validateLoginInput } from "./auth.validator";
import { loginPatient } from "./auth.service";
import { HttpError } from "../../utils/httpError";

/**
 * POST /api/auth/login
 *
 * 1. Valida que vengan correo y contraseña.
 * 2. Busca al paciente por correo -> si no existe, 404.
 * 3. Compara la contraseña contra el hash guardado -> si no coincide, 401.
 * 4. Si todo es correcto, 200 con los datos públicos del paciente.
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { errors, data } = validateLoginInput(req.body);

    if (Object.keys(errors).length > 0) {
      throw HttpError.badRequest("Datos inválidos.", errors);
    }

    const { paciente, token } = await loginPatient(data);
    res.status(200).json({
      message: "Inicio de sesión exitoso.",
      paciente,
      token,
    });
  } catch (error) {
    next(error);
  }
}