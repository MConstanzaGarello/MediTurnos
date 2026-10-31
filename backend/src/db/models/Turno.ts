import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize";
import { sequelize } from "../../config/database";
import { Especialidad } from "./Especialidad";
import { Profesional } from "./Profesional";
import { Paciente } from "./Paciente";
import {
  ESTADOS_TURNO,
  type EstadoTurno,
} from "../../modules/turnos/turno.constants";

/**
 * Modelo Turno (HU-03).
 *
 * `pacienteId` es NULLABLE a propósito: todavía no existe sesión/login
 * real (HU-02 sigue sin backend de autenticación), así que por ahora no
 * hay forma de saber qué paciente está pidiendo el turno. El campo ya
 * apunta con FK real a `pacientes` para no tener que migrar la tabla
 * de nuevo el día que exista el login: ahí simplemente se empieza a
 * completar.
 *
 * El índice único parcial (profesional_id, fecha, hora) WHERE estado <>
 * 'cancelado' -ver migración 20261012000000-add-estado-to-turnos- es lo
 * que garantiza a nivel de base de datos que no se pueda reservar un
 * horario ocupado ni duplicar un turno vigente en el mismo horario.
 *
 * `estado` (HU-04 / HU-05): "confirmado" por defecto, "cancelado" cuando
 * el paciente lo cancela.
 */
export class Turno extends Model<
  InferAttributes<Turno>,
  InferCreationAttributes<Turno>
> {
  declare id: CreationOptional<number>;
  declare pacienteId: ForeignKey<Paciente["id"]> | null;
  declare especialidadId: ForeignKey<Especialidad["id"]>;
  declare profesionalId: ForeignKey<Profesional["id"]>;
  declare fecha: string;
  declare hora: string;
  declare estado: CreationOptional<EstadoTurno>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociaciones cargadas con `include` (ver db/models/index.ts). Solo
  // existen cuando la consulta las pide, por ejemplo en "Mis turnos".
  declare Especialidad?: NonAttribute<Especialidad>;
  declare Profesional?: NonAttribute<Profesional>;
}

Turno.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pacienteId: {
      type: DataTypes.INTEGER,
      allowNull: true, // TODO: pasar a obligatorio cuando exista sesión real (HU-02).
      field: "paciente_id",
      references: {
        model: "pacientes",
        key: "id",
      },
    },
    especialidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "especialidad_id",
      references: {
        model: "especialidades",
        key: "id",
      },
    },
    profesionalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "profesional_id",
      references: {
        model: "profesionales",
        key: "id",
      },
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora: {
      type: DataTypes.STRING(5), // formato "HH:MM"
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "confirmado",
      validate: {
        isIn: [ESTADOS_TURNO as unknown as string[]],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Turno",
    tableName: "turnos",
    timestamps: true,
  }
);
