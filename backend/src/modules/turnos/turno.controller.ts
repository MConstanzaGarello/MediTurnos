import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import { validateTurnoCreateInput } from "./turno.validator";
import {
  createTurno,
  getHorariosDisponibilidad,
  getTurnosDelPaciente,
} from "./turno.service";

/** GET /api/turnos/horarios-disponibles?profesionalId=1&fecha=2026-08-30 */
export async function getHorariosDisponibilidadHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profesionalId = Number(req.query.profesionalId);
    const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";

    if (!req.query.profesionalId || Number.isNaN(profesionalId)) {
      throw HttpError.badRequest("Seleccione un profesional.", {
        profesional: "Seleccione un profesional.",
      });
    }
    if (!fecha) {
      throw HttpError.badRequest("Seleccione una fecha.", {
        fecha: "Seleccione una fecha.",
      });
    }

    const horarios = await getHorariosDisponibilidad(profesionalId, fecha);
    res.status(200).json({ horarios });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/turnos (protegido por requireAuth, ver turno.routes.ts)
 *
 * 1. requireAuth ya validó el JWT y dejó `req.pacienteId`.
 * 2. Se valida el payload (especialidad/profesional/fecha/hora).
 * 3. Se delega en el service, que verifica disponibilidad real y guarda,
 *    asociando el turno al paciente autenticado.
 * 4. Devuelve 201 con el turno creado y el mensaje exacto de la consigna.
 */
export async function createTurnoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.pacienteId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const { errors, data } = validateTurnoCreateInput(req.body);

    if (!data || Object.keys(errors).length > 0) {
      const primerMensaje = Object.values(errors)[0] ?? "Datos inválidos.";
      throw HttpError.badRequest(primerMensaje, errors);
    }

    const turno = await createTurno(data, req.pacienteId);
    res.status(201).json({
      message: "Turno solicitado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/turnos/mis-turnos (protegido por requireAuth) — HU-04.
 *
 * Devuelve 200 con `{ turnos: MiTurno[] }`, que puede ser una lista vacía.
 * El paciente sale del JWT (req.pacienteId), así que un paciente nunca
 * puede ver los turnos de otro.
 */
export async function getMisTurnosHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.pacienteId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnos = await getTurnosDelPaciente(req.pacienteId);
    res.status(200).json({ turnos });
  } catch (error) {
    next(error);
  }
}
