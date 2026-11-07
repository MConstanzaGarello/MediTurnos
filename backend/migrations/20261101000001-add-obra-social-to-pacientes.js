"use strict";

/**
 * Portal del Médico — agrega `obra_social` a `pacientes`.
 *
 * Es NULLABLE: el formulario de registro actual (HU-01) no la pide, así que
 * los pacientes existentes y los nuevos quedan en NULL hasta que se cargue.
 * La pantalla "Mis pacientes" del médico muestra "Sin obra social" en ese caso.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("pacientes", "obra_social", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("pacientes", "obra_social");
  },
};
