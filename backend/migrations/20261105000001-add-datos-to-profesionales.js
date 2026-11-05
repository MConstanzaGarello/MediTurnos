"use strict";

/**
 * HU-11 (alta de médico): el profesional pasa a tener matrícula, email
 * institucional (@mediturnos.com), contraseña (hasheada) y precio del turno
 * particular. Son NULL para los profesionales que ya existían (cargados con
 * el seeder de HU-03), que todavía no tienen usuario para ingresar.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("profesionales", "matricula", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.addColumn("profesionales", "email", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("profesionales", "password", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("profesionales", "precio_particular", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    // UNIQUE (los NULL no chocan entre sí en PostgreSQL).
    await queryInterface.addConstraint("profesionales", {
      fields: ["matricula"],
      type: "unique",
      name: "profesionales_matricula_unique",
    });
    await queryInterface.addConstraint("profesionales", {
      fields: ["email"],
      type: "unique",
      name: "profesionales_email_unique",
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE profesionales ADD CONSTRAINT profesionales_precio_check CHECK (precio_particular IS NULL OR precio_particular > 0)"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE profesionales DROP CONSTRAINT IF EXISTS profesionales_precio_check"
    );
    await queryInterface.removeConstraint("profesionales", "profesionales_email_unique");
    await queryInterface.removeConstraint("profesionales", "profesionales_matricula_unique");
    await queryInterface.removeColumn("profesionales", "precio_particular");
    await queryInterface.removeColumn("profesionales", "password");
    await queryInterface.removeColumn("profesionales", "email");
    await queryInterface.removeColumn("profesionales", "matricula");
  },
};
