import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

/**
 * Middleware de errores centralizado.
 * - HttpError (400/409/etc.) -> se devuelve tal cual, con detalle de campos.
 * - Cualquier otro error -> 500 genérico, sin exponer detalles internos
 *   (stack traces, mensajes de PostgreSQL, etc.) al cliente.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  console.error("[MediTurnos API] Error interno:", err);
  res.status(500).json({
    message: "Ocurrió un error interno. Intente nuevamente más tarde.",
  });
}
