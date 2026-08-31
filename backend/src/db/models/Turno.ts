import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/database";
import { Especialidad } from "./Especialidad";
import { Profesional } from "./Profesional";
import { Paciente } from "./Paciente";

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
 * La restricción UNIQUE (profesional_id, fecha, hora) -ver migración-
 * es lo que garantiza a nivel de base de datos que no se pueda reservar
 * un horario ocupado ni duplicar un turno en el mismo horario.
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
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
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
