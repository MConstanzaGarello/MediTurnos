import type { NextFunction, Request, Response } from "express";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import {
  ESTADO_CANCELADO,
  ESTADOS_ASIGNABLES_POR_MEDICO,
  type EstadoAsignablePorMedico,
} from "./turno.constants";
import type { MiTurno } from "./turno.types";

/**
 * Portal del Médico — cambiar el estado de un turno propio.
 *
 * PATCH /api/turnos/:id/estado   body: { "estado": "atendido" | "pendiente" }
 */

export const MENSAJE_ERROR_ESTADO =
  "No fue posible actualizar el estado del turno. Intente nuevamente.";

function esEstadoAsignable(valor: unknown): valor is EstadoAsignablePorMedico {
  return (
    typeof valor === "string" &&
    (ESTADOS_ASIGNABLES_POR_MEDICO as readonly string[]).includes(valor)
  );
}

/**
 * Reglas:
 * - Turno inexistente o de otro médico -> 404 (mismo mensaje, para no
 *   revelar si existe).
 * - Turno cancelado -> 409 (un turno cancelado no se reabre desde acá).
 * - Marcar "atendido" un turno de una fecha futura -> 400.
 * - Si ya está en ese estado, la operación es idempotente (200).
 */
export async function updateEstadoTurno(
  turnoId: number,
  profesionalId: number,
  estado: EstadoAsignablePorMedico
): Promise<Pick<MiTurno, "id" | "estado">> {
  const turno = await Turno.findByPk(turnoId);

  if (!turno || turno.profesionalId !== profesionalId) {
    throw HttpError.notFound(MENSAJE_ERROR_ESTADO);
  }

  if (turno.estado === ESTADO_CANCELADO) {
    throw HttpError.conflict("No se puede modificar un turno cancelado.");
  }

  if (estado === "atendido" && turno.fecha > hoyArgentina()) {
    throw HttpError.badRequest(
      "No se puede marcar como atendido un turno de una fecha futura."
    );
  }

  if (turno.estado !== estado) {
    await turno.update({ estado });
  }

  return { id: turno.id, estado: turno.estado };
}

export async function updateEstadoTurnoHandler(
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

    const estado = (req.body as { estado?: unknown } | undefined)?.estado;
    if (!esEstadoAsignable(estado)) {
      throw HttpError.badRequest(
        'El estado debe ser "atendido" o "pendiente".',
        { estado: 'El estado debe ser "atendido" o "pendiente".' }
      );
    }

    const turno = await updateEstadoTurno(turnoId, req.profesionalId, estado);
    res.status(200).json({
      message: "El estado del turno fue actualizado correctamente.",
      turno,
    });
  } catch (error) {
    next(error);
  }
}
