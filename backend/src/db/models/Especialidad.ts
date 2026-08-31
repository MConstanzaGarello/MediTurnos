import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/database";

/**
 * Modelo Especialidad (HU-03, subtarea "listado de especialidades").
 */
export class Especialidad extends Model<
  InferAttributes<Especialidad>,
  InferCreationAttributes<Especialidad>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Especialidad.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
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
    modelName: "Especialidad",
    tableName: "especialidades",
    timestamps: true,
  }
);
