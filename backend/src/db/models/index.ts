import { sequelize } from "../../config/database";
import { Paciente } from "./Paciente";

export { sequelize, Paciente };

/**
 * Verifica la conexión a PostgreSQL. Se llama al arrancar el servidor
 * (ver src/server.ts) para fallar rápido si la base no está disponible.
 */
export async function assertDatabaseConnection(): Promise<void> {
  await sequelize.authenticate();
}
