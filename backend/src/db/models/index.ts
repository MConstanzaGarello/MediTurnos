import { sequelize } from "../../config/database";
import { Paciente } from "./Paciente";
import { Especialidad } from "./Especialidad";
import { Profesional } from "./Profesional";
import { Turno } from "./Turno";

// Asociaciones (HU-03)
Especialidad.hasMany(Profesional, { foreignKey: "especialidadId" });
Profesional.belongsTo(Especialidad, { foreignKey: "especialidadId" });

Especialidad.hasMany(Turno, { foreignKey: "especialidadId" });
Turno.belongsTo(Especialidad, { foreignKey: "especialidadId" });

Profesional.hasMany(Turno, { foreignKey: "profesionalId" });
Turno.belongsTo(Profesional, { foreignKey: "profesionalId" });

Paciente.hasMany(Turno, { foreignKey: "pacienteId" });
Turno.belongsTo(Paciente, { foreignKey: "pacienteId" });

export { sequelize, Paciente, Especialidad, Profesional, Turno };

/**
 * Verifica la conexión a PostgreSQL. Se llama al arrancar el servidor
 * (ver src/server.ts) para fallar rápido si la base no está disponible.
 */
export async function assertDatabaseConnection(): Promise<void> {
  await sequelize.authenticate();
}
