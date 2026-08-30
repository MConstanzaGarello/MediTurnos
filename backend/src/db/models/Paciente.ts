import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/database";

/**
 * Modelo Paciente (HU-01).
 *
 * Restricciones a nivel de base de datos (no solo en la app):
 * - dni: UNIQUE
 * - email: UNIQUE
 * La contraseña se guarda siempre hasheada (ver src/utils/password.ts);
 * este modelo nunca debe recibir ni exponer la contraseña en texto plano.
 */
export class Paciente extends Model<
  InferAttributes<Paciente>,
  InferCreationAttributes<Paciente>
> {
  declare id: CreationOptional<number>;
  declare nombre: string;
  declare apellido: string;
  declare dni: string;
  declare fechaNacimiento: string;
  declare email: string;
  declare telefono: string;
  declare password: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Paciente.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    dni: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
    fechaNacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "fecha_nacimiento",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
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
    modelName: "Paciente",
    tableName: "pacientes",
    timestamps: true,
  }
);
