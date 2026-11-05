"use strict";

/**
 * HU-11: obras sociales y relación muchos a muchos con profesionales
 * (un médico atiende varias obras sociales y una obra social tiene varios
 * médicos). Se cargan las obras sociales iniciales para poder elegirlas.
 */
const OBRAS_SOCIALES_INICIALES = [
  "OSDE",
  "Swiss Medical",
  "Galeno",
  "Medicus",
  "PAMI",
  "IOMA",
  "OSECAC",
  "Sancor Salud",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("obras_sociales", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("profesional_obras_sociales", {
      profesional_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "profesionales", key: "id" },
        onDelete: "CASCADE",
      },
      obra_social_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "obras_sociales", key: "id" },
        onDelete: "CASCADE",
      },
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "obras_sociales",
      OBRAS_SOCIALES_INICIALES.map((nombre) => ({ nombre, created_at: now, updated_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("profesional_obras_sociales");
    await queryInterface.dropTable("obras_sociales");
  },
};
