"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("pacientes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      apellido: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      dni: {
        type: Sequelize.STRING(8),
        allowNull: false,
      },
      fecha_nacimiento: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      telefono: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Restricciones UNIQUE explícitas (además de las declaradas arriba)
    // para que quede documentado en la base y sea robusto ante
    // condiciones de carrera en el registro.
    await queryInterface.addConstraint("pacientes", {
      fields: ["dni"],
      type: "unique",
      name: "pacientes_dni_unique",
    });

    await queryInterface.addConstraint("pacientes", {
      fields: ["email"],
      type: "unique",
      name: "pacientes_email_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("pacientes");
  },
};
