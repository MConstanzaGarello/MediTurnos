import { sequelize } from "../../config/database";
import { Paciente } from "./Paciente";
import { Especialidad } from "./Especialidad";
import { Profesional } from "./Profesional";
import { Turno } from "./Turno";
import { Administrador } from "./Administrador";
import { ObraSocial } from "./ObraSocial";

// Asociaciones (HU-03)
Especialidad.hasMany(Profesional, { foreignKey: "especialidadId" });
Profesional.belongsTo(Especialidad, { foreignKey: "especialidadId" });

Especialidad.hasMany(Turno, { foreignKey: "especialidadId" });
Turno.belongsTo(Especialidad, { foreignKey: "especialidadId" });

Profesional.hasMany(Turno, { foreignKey: "profesionalId" });
Turno.belongsTo(Profesional, { foreignKey: "profesionalId" });

Paciente.hasMany(Turno, { foreignKey: "pacienteId" });
Turno.belongsTo(Paciente, { foreignKey: "pacienteId" });

// Asociaciones (HU-11): un profesional atiende varias obras sociales.
Profesional.belongsToMany(ObraSocial, {
  through: "profesional_obras_sociales",
  foreignKey: "profesional_id",
  otherKey: "obra_social_id",
  timestamps: false,
});
ObraSocial.belongsToMany(Profesional, {
  through: "profesional_obras_sociales",
  foreignKey: "obra_social_id",
  otherKey: "profesional_id",
  timestamps: false,
});

export {
  sequelize,
  Paciente,
  Especialidad,
  Profesional,
  Turno,
  Administrador,
  ObraSocial,
};

/**
 * Verifica la conexión a PostgreSQL. Se llama al arrancar el servidor
 * (ver src/server.ts) para fallar rápido si la base no está disponible.
 */
export async function assertDatabaseConnection(): Promise<void> {
  await sequelize.authenticate();
}
