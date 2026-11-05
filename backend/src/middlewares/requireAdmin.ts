import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de autorización por rol (HU-11, HU-12).
 * Deja pasar solo a un administrador autenticado:
 * - sin token o token inválido -> 401
 * - token válido de otro rol (paciente/médico) -> 403
 * El rol sale del JWT firmado, nunca de datos que mande el cliente.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Debe iniciar sesión para continuar."));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifySessionToken(token);
    if (payload.rol !== "admin" || typeof payload.adminId !== "number") {
      return next(HttpError.forbidden("No tiene permisos para acceder a esta sección."));
    }
    req.adminId = payload.adminId;
    next();
  } catch {
    next(HttpError.unauthorized("La sesión expiró o no es válida. Inicie sesión nuevamente."));
  }
}
