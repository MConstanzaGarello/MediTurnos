import type { NextFunction, Request, Response } from "express";
import { verifyDoctorToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de autenticación del Portal del Médico.
 *
 * Lee el JWT del header `Authorization: Bearer <token>`, comprueba que sea
 * un token de MÉDICO (un token de paciente se rechaza) y deja el id del
 * profesional en `req.profesionalId`. Nunca se confía en un id que venga en
 * el body o en la URL.
 */
export function requireDoctorAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Debe iniciar sesión para continuar."));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyDoctorToken(token);
    req.profesionalId = payload.profesionalId;
    next();
  } catch {
    next(
      HttpError.unauthorized(
        "La sesión expiró o no es válida. Inicie sesión nuevamente."
      )
    );
  }
}
