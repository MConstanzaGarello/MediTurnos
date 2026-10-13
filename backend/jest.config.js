/**
 * Pruebas del backend (Jest + ts-jest + Supertest).
 * - tests/unit: lógica aislada, sin base de datos.
 * - tests/integration: API real contra una base PostgreSQL de prueba
 *   (DB_NAME_TEST, por defecto "mediturnos_test"), que se prepara con las
 *   migraciones reales en tests/globalSetup.js.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  // Las pruebas de integración comparten la base de prueba: una a la vez.
  maxWorkers: 1,
};
