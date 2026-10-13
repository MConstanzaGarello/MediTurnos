// Se ejecuta antes de cada archivo de prueba, ANTES de importar la app:
// apunta la conexión a la base de prueba para no tocar la de desarrollo.
require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.DB_NAME_TEST || `${process.env.DB_NAME || "mediturnos"}_test`;
process.env.JWT_SECRET = process.env.JWT_SECRET || "mediturnos-test-secret";
