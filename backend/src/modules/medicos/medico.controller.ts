import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import {
  actualizarPerfil,
  getDashboard,
  getPacientesAtendidos,
  getPerfil,
} from "./medico.service";
import { esFechaValida, validatePerfilInput } from "./medico.validator";

function profesionalIdDe(req: Request): number {
  if (!req.profesionalId) {
    throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
  }
  return req.profesionalId;
}

/**
 * GET /api/medicos/dashboard?fecha=YYYY-MM-DD -> métricas y turnos del día.
 * Sin `fecha` devuelve el día de hoy.
 */
export async function getDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profesionalId = profesionalIdDe(req);

    const fecha = req.query.fecha;
    if (fecha !== undefined && (typeof fecha !== "string" || !esFechaValida(fecha))) {
      throw HttpError.badRequest("Seleccione una fecha válida.", {
        fecha: "Seleccione una fecha válida.",
      });
    }

    const dashboard = await getDashboard(profesionalId, fecha);
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
}

/** GET /api/medicos/pacientes -> pacientes únicos atendidos. */
export async function getPacientesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const pacientes = await getPacientesAtendidos(profesionalIdDe(req));
    res.status(200).json({ pacientes });
  } catch (error) {
    next(error);
  }
}

/** GET /api/medicos/perfil -> datos del médico autenticado. */
export async function getPerfilHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const perfil = await getPerfil(profesionalIdDe(req));
    res.status(200).json({ perfil });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/medicos/perfil -> actualiza días de atención y horario/detalle. */
export async function actualizarPerfilHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profesionalId = profesionalIdDe(req);

    const { errors, data } = validatePerfilInput(req.body);
    if (!data) {
      throw HttpError.badRequest(Object.values(errors)[0] ?? "Datos inválidos.", errors);
    }

    const perfil = await actualizarPerfil(profesionalId, data);
    res.status(200).json({
      message: "Tus datos de atención se actualizaron correctamente.",
      perfil,
    });
  } catch (error) {
    next(error);
  }
}
