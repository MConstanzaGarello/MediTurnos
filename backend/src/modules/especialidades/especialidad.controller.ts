import type { NextFunction, Request, Response } from "express";
import { listEspecialidades } from "./especialidad.service";

/** GET /api/especialidades */
export async function listEspecialidadesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const especialidades = await listEspecialidades();
    res.status(200).json({ especialidades });
  } catch (error) {
    next(error);
  }
}
