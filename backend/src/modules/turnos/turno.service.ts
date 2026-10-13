import { UniqueConstraintError } from "sequelize";
import { Especialidad, Profesional, Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { HORARIOS_POSIBLES } from "./turno.constants";
import type {
  HorarioDisponibilidad,
  MiTurno,
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

function toMiTurno(turno: Turno): MiTurno {
  return {
    id: turno.id,
    fecha: turno.fecha,
    hora: turno.hora,
    estado: turno.estado,
    especialidad: {
      id: turno.especialidadId,
      nombre: turno.Especialidad?.nombre ?? "",
    },
    profesional: {
      id: turno.profesionalId,
      nombre: turno.Profesional?.nombre ?? "",
      info: turno.Profesional?.info ?? "",
    },
  };
}

/**
 * HU-04 — Consultar mis turnos.
 *
 * Devuelve SOLO los turnos del paciente indicado (`pacienteId` sale del
 * JWT verificado por requireAuth, nunca de la URL ni del body), con la
 * especialidad y el profesional de cada uno, ordenados por fecha y hora
 * ascendente (criterio: "Los turnos deberán mostrarse ordenados por
 * fecha"). Si no tiene turnos devuelve una lista vacía: el mensaje "No
 * posee turnos programados." lo muestra el frontend.
 */
export async function getTurnosDelPaciente(pacienteId: number): Promise<MiTurno[]> {
  const turnos = await Turno.findAll({
    where: { pacienteId },
    include: [
      { model: Especialidad, attributes: ["id", "nombre"] },
      { model: Profesional, attributes: ["id", "nombre", "info"] },
    ],
    order: [
      ["fecha", "ASC"],
      ["hora", "ASC"],
      ["id", "ASC"],
    ],
  });

  return turnos.map(toMiTurno);
}

export async function reprogramarTurno(
  turnoId: number,
  pacienteId: number,
  nuevaFecha: string,
  nuevaHora: string
): Promise<PublicTurno> {
  const turno = await Turno.findOne({ where: { id: turnoId, pacienteId } });

  if (!turno) {
    throw HttpError.notFound("El turno no existe o no te pertenece.");
  }

  if (turno.estado !== "confirmado") {
    throw HttpError.badRequest("Solo se pueden reprogramar turnos confirmados.");
  }

  const fechaTurnoOriginal = new Date(`${turno.fecha}T${turno.hora}:00-03:00`);
  const ahora = new Date();
  const horasDiferencia = (fechaTurnoOriginal.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (horasDiferencia < 24) {
    throw HttpError.badRequest("Solo se pueden reprogramar turnos con al menos 24 horas de anticipación.");
  }

  const ocupado = await Turno.findOne({
    where: {
      profesionalId: turno.profesionalId,
      fecha: nuevaFecha,
      hora: nuevaHora,
      estado: "confirmado"
    },
  });

  if (ocupado) {
    throw HttpError.conflict("El horario seleccionado ya no se encuentra disponible.");
  }

  turno.fecha = nuevaFecha;
  turno.hora = nuevaHora;
  await turno.save();

  return toPublicTurno(turno);
}
