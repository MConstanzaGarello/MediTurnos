"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("turnos", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      // Nullable a propósito: todavía no hay login real (HU-02).
      // Ver comentario en backend/src/db/models/Turno.ts.
      paciente_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "pacientes",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      especialidad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "especialidades",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      profesional_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "profesionales",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      fecha: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      hora: {
        type: Sequelize.STRING(5),
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

    // Garantiza a nivel de base de datos que no se pueda reservar un
    // horario ya ocupado ni duplicar un turno en el mismo horario para
    // el mismo profesional (criterio de aceptación de HU-03).
    await queryInterface.addConstraint("turnos", {
      fields: ["profesional_id", "fecha", "hora"],
      type: "unique",
      name: "turnos_profesional_fecha_hora_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("turnos");
  },
};
