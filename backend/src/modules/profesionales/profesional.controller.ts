import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import { listProfesionalesPorEspecialidad } from "./profesional.service";

/**
 * GET /api/profesionales?especialidadId=1
 * Requiere especialidadId: sin especialidad elegida no tiene sentido
 * pedir el listado (mismo criterio que en el frontend: hay que elegir
 * especialidad antes que profesional).
 */
export async function listProfesionalesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const especialidadId = Number(req.query.especialidadId);

    if (!req.query.especialidadId || Number.isNaN(especialidadId)) {
      throw HttpError.badRequest("Seleccione una especialidad.", {
        especialidadId: "Seleccione una especialidad.",
      });
    }

    const profesionales = await listProfesionalesPorEspecialidad(especialidadId);
    res.status(200).json({ profesionales });
  } catch (error) {
    next(error);
  }
}
