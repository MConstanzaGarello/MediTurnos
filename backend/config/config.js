/**
 * Configuración de Sequelize CLI (migraciones). Lee las mismas variables
 * de entorno que usa la app en runtime (ver backend/.env.example).
 */
require("dotenv").config();

const base = {
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Cuatriciclo12",
  database: process.env.DB_NAME || "mediturnos",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  dialect: "postgres",
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || `${base.database}_test`,
  },
  production: {
    ...base,
    dialectOptions: process.env.DB_SSL === "true"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined,
  },
};
