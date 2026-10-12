/**
 * Prepara la base de prueba una vez antes de correr las pruebas:
 * la crea si no existe y la deja con todas las migraciones aplicadas
 * desde cero (así también se prueban las migraciones).
 *
 * Usa el entorno "test" de backend/config/config.js.
 */
const { execSync } = require("child_process");

function run(cmd, { ignoreError = false } = {}) {
  try {
    execSync(cmd, { stdio: "pipe", cwd: __dirname + "/.." });
  } catch (error) {
    if (!ignoreError) {
      const salida = String(error.stdout || "") + String(error.stderr || "");
      throw new Error(`Falló "${cmd}":\n${salida}`);
    }
  }
}

module.exports = async () => {
  const env = { ...process.env, NODE_ENV: "test" };
  process.env = env;
  run("npx sequelize-cli db:create --env test", { ignoreError: true }); // ya existe -> ok
  run("npx sequelize-cli db:migrate:undo:all --env test");
  run("npx sequelize-cli db:migrate --env test");
};
