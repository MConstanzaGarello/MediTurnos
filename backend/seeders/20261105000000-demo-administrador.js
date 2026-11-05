"use strict";

const bcrypt = require("bcrypt");

/**
 * HU-11: crea el administrador inicial para poder entrar al panel.
 * Usuario: admin@mediturnos.com  ·  Contraseña: Admin1234
 * (cambiarla si esto se usa fuera del TP).
 */
/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const password = await bcrypt.hash("Admin1234", 10);
    await queryInterface.bulkInsert("administradores", [
      {
        nombre: "Administrador",
        apellido: "MediTurnos",
        email: "admin@mediturnos.com",
        password,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("administradores", { email: "admin@mediturnos.com" });
  },
};
