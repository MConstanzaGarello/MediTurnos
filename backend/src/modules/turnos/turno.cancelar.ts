import type { NextFunction, Request, Response } from "express";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { ESTADO_CANCELADO } from "./turno.constants";
import type { MiTurno } from "./turno.types";

/**
 * HU-05 — Cancelar turno.
 *
 * Servicio + controlador de la cancelación. Para liberar el horario no hace
 * falta tocar nada más: el turno queda en estado "cancelado" y tanto
 * getHorariosDisponibilidad como createTurno (turno.service.ts) y el índice
 * único parcial de la base ignoran los turnos cancelados.
 */

/** Mensaje exacto de HU-05 para cualquier falla al cancelar. */
export const MENSAJE_ERROR_CANCELAR =
  "No fue posible cancelar el turno. Intente nuevamente.";

/**
 * Misma lógica que turno.validator.ts: fecha anterior al día actual, tomando
 * como "hoy" la fecha de Argentina (UTC-3) y no la de UTC.
 */
function isFechaPasada(fecha: string): boolean {
  const hoyAR = new Date(Date.now() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return fecha < hoyAR;
}

/**
 * Cancela un turno del paciente autenticado.
 * - Turno inexistente o de otro paciente -> 404 (mismo mensaje en los dos
 *   casos, para no revelar si el turno existe).
 * - Turno ya cancelado -> 409.
 * - Turno con fecha anterior al día actual -> 400.
 */
export async function cancelTurno(
  turnoId: number,
  pacienteId: number
): Promise<Pick<MiTurno, "id" | "estado">> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.pacienteId !== pacienteId) {
    throw HttpError.notFound(MENSAJE_ERROR_CANCELAR);
  }

  if (turno.estado === ESTADO_CANCELADO) {
    throw HttpError.conflict(MENSAJE_ERROR_CANCELAR);
  }

  if (isFechaPasada(turno.fecha)) {
    throw HttpError.badRequest(MENSAJE_ERROR_CANCELAR);
  }

  await turno.update({ estado: ESTADO_CANCELADO });

  return { id: turno.id, estado: turno.estado };
}

/**
 * PATCH /api/turnos/:id/cancelar (protegido por requireAuth)
 *
 * El paciente sale del JWT (req.pacienteId), nunca del body ni de la URL.
 * Devuelve 200 con el mensaje exacto de la consigna.
 */
export async function cancelTurnoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.pacienteId) {
      throw HttpError.unauthorized("Debe iniciar sesión para continuar.");
    }

    const turnoId = Number(req.params.id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw HttpError.badRequest(MENSAJE_ERROR_CANCELAR);
    }

    const turno = await cancelTurno(turnoId, req.pacienteId);
    res.status(200).json({
      message: "Turno cancelado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}