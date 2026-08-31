import { UniqueConstraintError } from "sequelize";
import { Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { HORARIOS_POSIBLES } from "./turno.constants";
import type {
  HorarioDisponibilidad,
  PublicTurno,
  TurnoCreateInput,
} from "./turno.types";

function toPublicTurno(turno: Turno): PublicTurno {
  return {
    id: turno.id,
    especialidadId: turno.especialidadId,
    profesionalId: turno.profesionalId,
    pacienteId: turno.pacienteId as number,
    fecha: turno.fecha,
    hora: turno.hora,
    createdAt: turno.createdAt.toISOString(),
  };
}

/**
 * Horarios posibles para un profesional en una fecha, marcando cuáles ya
 * están ocupados. Si no hay ningún horario libre, el frontend es quien
 * debe mostrar "No hay horarios disponibles." (criterio de HU-03).
 */
export async function getHorariosDisponibilidad(
  profesionalId: number,
  fecha: string
): Promise<HorarioDisponibilidad[]> {
  const turnosDelDia = await Turno.findAll({
    where: { profesionalId, fecha },
  });
  const ocupados = new Set(turnosDelDia.map((t) => t.hora));

  return HORARIOS_POSIBLES.map((hora) => ({
    hora,
    ocupado: ocupados.has(hora),
  }));
}

/**
 * Registra un turno para el paciente autenticado (`pacienteId` viene del
 * JWT verificado por requireAuth, nunca del cliente).
 * 1. Verifica que el horario siga disponible (no lo haya tomado otro
 *    paciente entre que el frontend cargó la lista y confirmó).
 * 2. Persiste en PostgreSQL.
 * También confía en la restricción UNIQUE de la base (profesional_id,
 * fecha, hora) como segunda barrera ante condiciones de carrera.
 */
export async function createTurno(
  input: TurnoCreateInput,
  pacienteId: number
): Promise<PublicTurno> {
  const yaExiste = await Turno.findOne({
    where: {
      profesionalId: input.profesionalId,
      fecha: input.fecha,
      hora: input.hora,
    },
  });

  if (yaExiste) {
    throw HttpError.conflict("No fue posible solicitar el turno. Intente nuevamente.");
  }

  try {
    const turno = await Turno.create({
      especialidadId: input.especialidadId,
      profesionalId: input.profesionalId,
      fecha: input.fecha,
      hora: input.hora,
      pacienteId,
    });

    return toPublicTurno(turno);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw HttpError.conflict(
        "No fue posible solicitar el turno. Intente nuevamente."
      );
    }
    throw error;
  }
}
