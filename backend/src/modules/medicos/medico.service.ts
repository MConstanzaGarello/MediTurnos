import { Especialidad, Paciente, Profesional, Turno } from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hoyArgentina } from "../../utils/fecha";
import { ESTADO_ATENDIDO } from "../turnos/turno.constants";
import type {
  ActualizarPerfilInput,
  DashboardMedico,
  MetricasDelDia,
  PacienteAtendido,
  PacienteDeTurno,
  PerfilMedico,
  TurnoDelDia,
} from "./medico.types";

const ATRIBUTOS_PACIENTE = [
  "id",
  "nombre",
  "apellido",
  "dni",
  "obraSocial",
  "telefono",
] as const;

function toPacienteDeTurno(paciente: Paciente): PacienteDeTurno {
  return {
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    dni: paciente.dni,
    obraSocial: paciente.obraSocial ?? null,
    telefono: paciente.telefono,
  };
}

/**
 * Dashboard del médico: métricas y agenda de una fecha (por defecto HOY, en
 * hora de Argentina). Sirve para ver días anteriores y próximos.
 * Solo considera turnos del profesional autenticado (sale del JWT).
 */
export async function getDashboard(
  profesionalId: number,
  fechaConsultada?: string
): Promise<DashboardMedico> {
  const hoy = hoyArgentina();
  const fecha = fechaConsultada ?? hoy;

  const turnos = await Turno.findAll({
    where: { profesionalId, fecha },
    include: [{ model: Paciente, attributes: [...ATRIBUTOS_PACIENTE] }],
    order: [
      ["hora", "ASC"],
      ["id", "ASC"],
    ],
  });

  const metricas: MetricasDelDia = {
    turnosHoy: turnos.length,
    confirmados: 0,
    pendientes: 0,
    cancelados: 0,
    atendidos: 0,
  };

  for (const turno of turnos) {
    if (turno.estado === "confirmado") metricas.confirmados += 1;
    else if (turno.estado === "pendiente") metricas.pendientes += 1;
    else if (turno.estado === "cancelado") metricas.cancelados += 1;
    else if (turno.estado === "atendido") metricas.atendidos += 1;
  }

  const lista: TurnoDelDia[] = turnos.map((turno) => ({
    id: turno.id,
    fecha: turno.fecha,
    hora: turno.hora,
    estado: turno.estado,
    paciente: turno.Paciente ? toPacienteDeTurno(turno.Paciente) : null,
  }));

  return { fecha, hoy, metricas, turnos: lista };
}

/**
 * Pacientes únicos que el médico ya atendió (turnos en estado "atendido"),
 * con la fecha de su última visita y la cantidad de visitas. Ordenados del
 * más reciente al más antiguo.
 */
export async function getPacientesAtendidos(
  profesionalId: number
): Promise<PacienteAtendido[]> {
  const turnos = await Turno.findAll({
    where: { profesionalId, estado: ESTADO_ATENDIDO },
    include: [
      { model: Paciente, attributes: [...ATRIBUTOS_PACIENTE], required: true },
    ],
    // Ordenado de más reciente a más antiguo: la primera aparición de cada
    // paciente es su última visita.
    order: [
      ["fecha", "DESC"],
      ["hora", "DESC"],
      ["id", "DESC"],
    ],
  });

  const porPaciente = new Map<number, PacienteAtendido>();

  for (const turno of turnos) {
    if (!turno.Paciente) continue;

    const existente = porPaciente.get(turno.Paciente.id);
    if (existente) {
      existente.totalVisitas += 1;
      continue;
    }

    porPaciente.set(turno.Paciente.id, {
      ...toPacienteDeTurno(turno.Paciente),
      ultimaVisita: turno.fecha,
      totalVisitas: 1,
    });
  }

  return Array.from(porPaciente.values());
}

/** Datos personales y profesionales del médico autenticado. */
export async function getPerfil(profesionalId: number): Promise<PerfilMedico> {
  const profesional = await Profesional.findByPk(profesionalId, {
    include: [{ model: Especialidad, attributes: ["id", "nombre"] }],
  });

  if (!profesional || !profesional.email) {
    throw HttpError.notFound("No se encontró el perfil del médico.");
  }

  return {
    id: profesional.id,
    nombre: profesional.nombre,
    email: profesional.email,
    matricula: profesional.matricula ?? null,
    telefono: profesional.telefono ?? null,
    diasAtencion: profesional.diasAtencion ?? null,
    info: profesional.info,
    especialidad: {
      id: profesional.especialidadId,
      nombre: profesional.Especialidad?.nombre ?? "",
    },
  };
}

/**
 * Actualiza los días de atención y el horario/detalle del médico autenticado.
 * Solo se pueden cambiar esos dos campos; el resto del perfil lo gestiona un
 * Administrativo. Devuelve el perfil completo ya actualizado.
 */
export async function actualizarPerfil(
  profesionalId: number,
  input: ActualizarPerfilInput
): Promise<PerfilMedico> {
  const profesional = await Profesional.findByPk(profesionalId);

  if (!profesional || !profesional.email) {
    throw HttpError.notFound("No se encontró el perfil del médico.");
  }

  await profesional.update({
    diasAtencion: input.diasAtencion,
    info: input.info,
  });

  return getPerfil(profesionalId);
}
