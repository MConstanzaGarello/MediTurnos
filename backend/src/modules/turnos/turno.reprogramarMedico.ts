import type { NextFunction, Request, Response } from "express";
import { Op, UniqueConstraintError } from "sequelize";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import { ESTADOS_VIGENTES, HORARIOS_POSIBLES } from "./turno.constants";
import type { EstadoTurno } from "./turno.constants";

/**
 * Portal del Médico — reprogramar un turno de un paciente.
 *
 * PUT /api/turnos/:id/reprogramar-medico   body: { "fecha": "YYYY-MM-DD", "hora": "HH:MM" }
 *
 * A diferencia de la reprogramación del paciente (HU-06), acá NO rige la
 * regla de las 24 h de anticipación: es el médico quien reorganiza su agenda.
 */

export const MENSAJE_ERROR_REPROGRAMAR =
  "No fue posible reprogramar el turno. Intente nuevamente.";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Hora actual de Argentina (UTC-3) en formato HH:MM. */
function horaActualArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function esFechaReal(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export interface TurnoReprogramadoMedico {
  id: number;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
}

/**
 * Reglas:
 * - Turno inexistente o de otro médico -> 404 (mismo mensaje en ambos casos).
 * - Turno cancelado o ya atendido -> 409.
 * - Fecha inválida/anterior a hoy, u horario fuera de la grilla -> 400.
 * - Hoy con un horario que ya pasó -> 400.
 * - Mismo día y horario que el actual -> 400.
 * - Horario ocupado por otro turno vigente -> 409.
 */
export async function reprogramarTurnoComoMedico(
  turnoId: number,
  profesionalId: number,
  fecha: string,
  hora: string
): Promise<TurnoReprogramadoMedico> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.profesionalId !== profesionalId) {
    throw HttpError.notFound(MENSAJE_ERROR_REPROGRAMAR);
  }

  if (!ESTADOS_VIGENTES.includes(turno.estado)) {
    throw HttpError.conflict(
      "Solo se pueden reprogramar turnos confirmados o pendientes."
    );
  }

  if (!esFechaReal(fecha)) {
    throw HttpError.badRequest("Seleccione una fecha válida.", {
      fecha: "Seleccione una fecha válida.",
    });
  }

  const hoy = hoyArgentina();
  if (fecha < hoy) {
    throw HttpError.badRequest("No se puede reprogramar a una fecha pasada.", {
      fecha: "No se puede reprogramar a una fecha pasada.",
    });
  }

  if (!HORARIOS_POSIBLES.includes(hora)) {
    throw HttpError.badRequest("Seleccione un horario disponible.", {
      hora: "Seleccione un horario disponible.",
    });
  }

  if (fecha === hoy && hora <= horaActualArgentina()) {
    throw HttpError.badRequest("Ese horario de hoy ya pasó.", {
      hora: "Ese horario de hoy ya pasó.",
    });
  }

  if (turno.fecha === fecha && turno.hora === hora) {
    throw HttpError.badRequest("El turno ya está en ese día y horario.");
  }

  const ocupado = await Turno.findOne({
    where: {
      id: { [Op.ne]: turno.id },
      profesionalId,
      fecha,
      hora,
      estado: { [Op.ne]: "cancelado" },
    },
  });

  if (ocupado) {
    throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
  }

  try {
    await turno.update({ fecha, hora });
  } catch (error) {
    // Segunda barrera: el índice único parcial de la base ante una carrera.
    if (error instanceof UniqueConstraintError) {
      throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
    }
    throw error;
  }

  return { id: turno.id, fecha: turno.fecha, hora: turno.hora, estado: turno.estado };
}

export async function reprogramarTurnoMedicoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.profesionalId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnoId = Number(req.params.id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw HttpError.badRequest("ID de turno inválido.");
    }

    const body = (req.body ?? {}) as { fecha?: unknown; hora?: unknown };
    const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
    const hora = typeof body.hora === "string" ? body.hora.trim() : "";

    if (!fecha || !hora) {
      const errors: Record<string, string> = {};
      if (!fecha) errors.fecha = "Seleccione una fecha válida.";
      if (!hora) errors.hora = "Seleccione un horario disponible.";
      throw HttpError.badRequest(Object.values(errors)[0], errors);
    }

    const turno = await reprogramarTurnoComoMedico(
      turnoId,
      req.profesionalId,
      fecha,
      hora
    );

    res.status(200).json({
      message: "El turno fue reprogramado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}
