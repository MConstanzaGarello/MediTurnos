import type { NextFunction, Request, Response } from "express";
import { validateLoginInput } from "./auth.validator";
import { login } from "./auth.service";
import { HttpError } from "../../utils/httpError";

/**
 * POST /api/auth/login — login único de pacientes y médicos.
 *
 * 1. Valida que vengan correo y contraseña.
 * 2. Busca el correo entre pacientes y, si no, entre médicos con acceso.
 *    No existe en ninguno -> 404; existe pero la contraseña no coincide -> 401.
 * 3. Credenciales correctas -> 200 con `rol` ("paciente" | "medico"), los
 *    datos públicos (`paciente` o `medico`) y el JWT correspondiente.
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

    const resultado = await login(data);
    res.status(200).json({
      message: "Inicio de sesión exitoso.",
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}
