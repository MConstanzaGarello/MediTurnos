import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/database";

/** Modelo ObraSocial (HU-11): obras sociales que puede atender un médico. */
export class ObraSocial extends Model<
  InferAttributes<ObraSocial>,
  InferCreationAttributes<ObraSocial>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ObraSocial.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, modelName: "ObraSocial", tableName: "obras_sociales", timestamps: true }
);
