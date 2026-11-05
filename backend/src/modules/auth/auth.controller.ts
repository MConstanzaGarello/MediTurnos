import type { NextFunction, Request, Response } from "express";
import { validateLoginInput } from "./auth.validator";
import { loginUser } from "./auth.service";
import { HttpError } from "../../utils/httpError";

/**
 * POST /api/auth/login
 *
 * 1. Valida que vengan correo y contraseña.
 * 2. Busca el correo (administrador, médico o paciente) -> si no existe, 404.
 * 3. Compara la contraseña contra el hash guardado -> si no coincide, 401.
 * 4. Si todo es correcto, 200 con el rol, los datos públicos y el JWT
 *    (un paciente recibe `paciente`, un administrador `admin`, un médico `medico`).
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

    const resultado = await loginUser(data);
    res.status(200).json({
      message: "Inicio de sesión exitoso.",
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}