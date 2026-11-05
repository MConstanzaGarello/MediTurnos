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
  /** HU-11: datos del alta. NULL en los profesionales anteriores a HU-11. */
  declare matricula: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare password: CreationOptional<string | null>;
  declare precioParticular: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociaciones cargadas con `include` (ver models/index.ts).
  declare Especialidad?: NonAttribute<Especialidad>;
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
    matricula: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
    precioParticular: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "precio_particular",
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
