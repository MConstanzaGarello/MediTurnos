import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import { MENSAJE_MEDICO_CREADO } from "./admin.constants";
import { validateAltaMedico, validateEspecialidadId } from "./medico.validator";
import {
  createMedico,
  getDashboard,
  getReporteMensual,
  listMedicos,
  listObrasSociales,
  updateEspecialidadMedico,
} from "./admin.service";

/** GET /api/admin/dashboard (HU-11) */
export async function dashboardHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await getDashboard());
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/medicos (HU-11) */
export async function listMedicosHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listMedicos());
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/obras-sociales (HU-11) */
export async function listObrasSocialesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listObrasSociales());
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/medicos (HU-11): alta de médico. */
export async function createMedicoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { errors, data } = validateAltaMedico(req.body);
    if (Object.keys(errors).length > 0) {
      throw HttpError.badRequest("Datos inválidos.", errors);
    }
    const medico = await createMedico(data);
    res.status(201).json({ message: MENSAJE_MEDICO_CREADO, medico });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/medicos/:id/especialidad (HU-11) */
export async function updateEspecialidadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const medicoId = Number(req.params.id);
    if (!Number.isInteger(medicoId) || medicoId <= 0) {
      throw HttpError.badRequest("El médico indicado no es válido.");
    }
    const especialidadId = validateEspecialidadId(req.body);
    if (especialidadId === null) {
      throw HttpError.badRequest("Datos inválidos.", {
        especialidadId: "Seleccioná una especialidad válida.",
      });
    }
    res.status(200).json(await updateEspecialidadMedico(medicoId, especialidadId));
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/reportes?mes=YYYY-MM (HU-12) */
export async function reporteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = typeof req.query.mes === "string" ? req.query.mes : undefined;
    res.status(200).json(await getReporteMensual(mes));
  } catch (error) {
    next(error);
  }
}
