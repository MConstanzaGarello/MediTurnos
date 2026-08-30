import { createApp } from "./app";
import { env } from "./config/env";
import { assertDatabaseConnection } from "./db/models";

async function main() {
  try {
    await assertDatabaseConnection();
    console.log("[MediTurnos API] Conexión a PostgreSQL OK.");
  } catch (error) {
    console.error(
      "[MediTurnos API] No se pudo conectar a PostgreSQL. Revisá backend/.env y que la base exista (npm run db:create && npm run db:migrate).",
      error
    );
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[MediTurnos API] Escuchando en http://localhost:${env.port}`);
  });
}

main();
