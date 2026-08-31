import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de autenticación (HU-02 + HU-03).
 *
 * Lee el JWT del header `Authorization: Bearer <token>`, lo valida y, si
 * es correcto, deja el id del paciente en `req.pacienteId` para que el
 * controlador lo use (por ejemplo, al crear un turno). No confía en
 * ningún dato de identidad que venga en el body de la request.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Debe iniciar sesión para continuar."));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifySessionToken(token);
    req.pacienteId = payload.pacienteId;
    next();
  } catch {
    next(HttpError.unauthorized("La sesión expiró o no es válida. Inicie sesión nuevamente."));
  }
}
