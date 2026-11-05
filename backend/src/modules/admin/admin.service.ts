import { Op, UniqueConstraintError } from "sequelize";
import {
  Administrador,
  Especialidad,
  ObraSocial,
  Paciente,
  Profesional,
  Turno,
  sequelize,
} from "../../db/models";
import { HttpError } from "../../utils/httpError";
import { hashPassword } from "../../utils/password";
import { fechaHoyArgentina, mesActualArgentina, rangoDelMes } from "../../utils/fecha";
import {
  INFO_AGENDA_INICIAL,
  MENSAJE_ESPECIALIDAD_ACTUALIZADA,
  MENSAJE_MEDICO_DUPLICADO,
  MENSAJE_MES_INVALIDO,
} from "./admin.constants";
import { buildReporte } from "./reportes.logic";
import type {
  AltaMedicoInput,
  DashboardAdmin,
  PublicMedico,
  ReporteMensual,
  TurnoParaReporte,
} from "./admin.types";

/* ------------------------------------------------------------------ */
/* HU-11: dashboard                                                    */
/* ------------------------------------------------------------------ */

/** Resumen y listado de los turnos de hoy (fecha de Argentina). */
export async function getDashboard(ahora: number = Date.now()): Promise<DashboardAdmin> {
  const fecha = fechaHoyArgentina(ahora);

  const turnos = await Turno.findAll({
    where: { fecha },
    include: [
      { model: Paciente, attributes: ["nombre", "apellido", "dni"] },
      { model: Profesional, attributes: ["nombre"] },
      { model: Especialidad, attributes: ["nombre"] },
    ],
    order: [["hora", "ASC"], ["id", "ASC"]],
  });

  const filas = turnos.map((t) => {
    const paciente = (t as unknown as { Paciente?: Paciente }).Paciente;
    return {
      id: t.id,
      hora: t.hora,
      paciente: paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—",
      dni: paciente?.dni ?? "—",
      profesional: t.Profesional?.nombre ?? "—",
      especialidad: t.Especialidad?.nombre ?? "—",
      estado: t.estado,
    };
  });

  const cancelados = filas.filter((f) => f.estado === "cancelado").length;

  return {
    fecha,
    resumen: {
      total: filas.length,
      confirmados: filas.length - cancelados,
      cancelados,
    },
    turnos: filas,
  };
}

/* ------------------------------------------------------------------ */
/* HU-11: médicos                                                      */
/* ------------------------------------------------------------------ */

function toPublicMedico(p: Profesional): PublicMedico {
  const obras = (p as unknown as { ObraSocials?: ObraSocial[] }).ObraSocials ?? [];
  return {
    id: p.id,
    nombre: p.nombre,
    matricula: p.matricula,
    email: p.email,
    info: p.info,
    precioParticular: p.precioParticular === null ? null : Number(p.precioParticular),
    especialidadId: p.especialidadId,
    especialidad: p.Especialidad?.nombre ?? "",
    obrasSociales: obras
      .map((o) => ({ id: o.id, nombre: o.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

const INCLUDE_MEDICO = [
  { model: Especialidad, attributes: ["id", "nombre"] },
  { model: ObraSocial, attributes: ["id", "nombre"], through: { attributes: [] } },
];

async function findMedicoPublico(id: number): Promise<PublicMedico> {
  const medico = await Profesional.findByPk(id, { include: INCLUDE_MEDICO });
  if (!medico) throw HttpError.notFound("El médico no existe.");
  return toPublicMedico(medico);
}

export async function listMedicos(): Promise<PublicMedico[]> {
  const medicos = await Profesional.findAll({
    include: INCLUDE_MEDICO,
    order: [["nombre", "ASC"]],
  });
  return medicos.map(toPublicMedico);
}

export async function listObrasSociales(): Promise<{ id: number; nombre: string }[]> {
  const obras = await ObraSocial.findAll({ order: [["nombre", "ASC"]] });
  return obras.map((o) => ({ id: o.id, nombre: o.nombre }));
}

/**
 * Alta de médico (HU-11). Valida que la especialidad y las obras sociales
 * existan y que matrícula y correo no estén usados (el correo es el usuario
 * con el que ingresa, así que tampoco puede coincidir con un paciente o
 * administrador). La contraseña temporal se guarda hasheada y el alta se
 * hace en una transacción (médico + obras sociales juntos o nada).
 */
export async function createMedico(input: AltaMedicoInput): Promise<PublicMedico> {
  const especialidad = await Especialidad.findByPk(input.especialidadId);
  if (!especialidad) {
    throw HttpError.badRequest("Datos inválidos.", {
      especialidadId: "La especialidad seleccionada no existe.",
    });
  }

  const obras = input.obrasSocialesIds.length
    ? await ObraSocial.findAll({ where: { id: { [Op.in]: input.obrasSocialesIds } } })
    : [];
  if (obras.length !== input.obrasSocialesIds.length) {
    throw HttpError.badRequest("Datos inválidos.", {
      obrasSocialesIds: "Alguna de las obras sociales seleccionadas no existe.",
    });
  }

  const [matriculaUsada, emailMedico, emailPaciente, emailAdmin] = await Promise.all([
    Profesional.findOne({ where: { matricula: input.matricula } }),
    Profesional.findOne({ where: { email: input.email } }),
    Paciente.findOne({ where: { email: input.email } }),
    Administrador.findOne({ where: { email: input.email } }),
  ]);
  if (matriculaUsada || emailMedico || emailPaciente || emailAdmin) {
    throw HttpError.conflict(MENSAJE_MEDICO_DUPLICADO, {
      ...(matriculaUsada ? { matricula: "Ya existe un médico con esta matrícula." } : {}),
      ...(emailMedico || emailPaciente || emailAdmin
        ? { email: "Este correo ya está registrado." }
        : {}),
    });
  }

  const password = await hashPassword(input.passwordTemporal);

  try {
    const id = await sequelize.transaction(async (transaction) => {
      const medico = await Profesional.create(
        {
          nombre: `${input.nombre} ${input.apellido}`,
          info: input.info ?? INFO_AGENDA_INICIAL,
          especialidadId: input.especialidadId,
          matricula: input.matricula,
          email: input.email,
          password,
          precioParticular: input.precioParticular.toFixed(2),
        },
        { transaction }
      );
      await (medico as unknown as { setObraSocials: (o: ObraSocial[], opts: object) => Promise<void> })
        .setObraSocials(obras, { transaction });
      return medico.id;
    });
    return await findMedicoPublico(id);
  } catch (error) {
    // Segunda barrera ante dos altas simultáneas: UNIQUE de la base.
    if (error instanceof UniqueConstraintError) {
      throw HttpError.conflict(MENSAJE_MEDICO_DUPLICADO);
    }
    throw error;
  }
}

/** Cambia la especialidad de un médico. Solo la modifica el administrador. */
export async function updateEspecialidadMedico(
  medicoId: number,
  especialidadId: number
): Promise<{ message: string; medico: PublicMedico }> {
  const medico = await Profesional.findByPk(medicoId);
  if (!medico) throw HttpError.notFound("El médico no existe.");

  const especialidad = await Especialidad.findByPk(especialidadId);
  if (!especialidad) {
    throw HttpError.badRequest("Datos inválidos.", {
      especialidadId: "La especialidad seleccionada no existe.",
    });
  }

  await medico.update({ especialidadId });
  return {
    message: MENSAJE_ESPECIALIDAD_ACTUALIZADA,
    medico: await findMedicoPublico(medicoId),
  };
}

/* ------------------------------------------------------------------ */
/* HU-12: reportes                                                     */
/* ------------------------------------------------------------------ */

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Reporte estadístico de un mes (YYYY-MM). Sin parámetro: mes actual. */
export async function getReporteMensual(
  mes: string | undefined,
  ahora: number = Date.now()
): Promise<ReporteMensual> {
  const mesElegido = mes ?? mesActualArgentina(ahora);
  if (!MES_REGEX.test(mesElegido)) {
    throw HttpError.badRequest(MENSAJE_MES_INVALIDO);
  }

  const { desde, hasta } = rangoDelMes(mesElegido);
  const turnos = await Turno.findAll({
    where: { fecha: { [Op.gte]: desde, [Op.lt]: hasta } },
    include: [
      { model: Profesional, attributes: ["nombre"] },
      { model: Especialidad, attributes: ["nombre"] },
    ],
  });

  const filas: TurnoParaReporte[] = turnos.map((t) => ({
    fecha: t.fecha,
    hora: t.hora,
    estado: t.estado,
    profesionalId: t.profesionalId,
    profesional: t.Profesional?.nombre ?? "—",
    especialidad: t.Especialidad?.nombre ?? "—",
  }));

  return buildReporte(mesElegido, filas, fechaHoyArgentina(ahora));
}
