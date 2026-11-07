"use strict";

/**
 * Portal del Médico — datos de acceso y perfil profesional.
 *
 * Agrega a `profesionales`:
 *   - email:         único. Es el usuario con el que el médico inicia sesión.
 *   - password:      hash bcrypt (nunca texto plano).
 *   - matricula:     matrícula profesional.
 *   - telefono:      teléfono de contacto.
 *   - dias_atencion: días de atención en texto libre (ej: "Lunes a Viernes").
 *
 * Todas son NULLABLE a propósito: los profesionales que ya existen (seeder
 * de HU-03) no tienen credenciales hasta que un Administrativo les dé de
 * alta. PostgreSQL permite varios NULL en una columna UNIQUE, así que no
 * hay conflicto entre ellos.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "profesionales",
        "email",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "password",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "matricula",
        { type: Sequelize.STRING(30), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "telefono",
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "profesionales",
        "dias_atencion",
        { type: Sequelize.STRING(150), allowNull: true },
        { transaction }
      );

      await queryInterface.addConstraint("profesionales", {
        fields: ["email"],
        type: "unique",
        name: "profesionales_email_unique",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint(
        "profesionales",
        "profesionales_email_unique",
        { transaction }
      );
      for (const columna of [
        "dias_atencion",
        "telefono",
        "matricula",
        "password",
        "email",
      ]) {
        await queryInterface.removeColumn("profesionales", columna, {
          transaction,
        });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
