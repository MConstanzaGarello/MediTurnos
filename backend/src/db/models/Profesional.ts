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

/**
 * Modelo Profesional (HU-03, subtarea "listado de médicos").
 * `info` guarda el texto libre de días/horario de atención y consultorio
 * (ej: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.").
 */
export class Profesional extends Model<
  InferAttributes<Profesional>,
  InferCreationAttributes<Profesional>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare info: string;
  declare especialidadId: ForeignKey<Especialidad["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Profesional.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    info: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    modelName: "Profesional",
    tableName: "profesionales",
    timestamps: true,
  }
);
