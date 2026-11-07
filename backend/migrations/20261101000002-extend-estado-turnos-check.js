"use strict";

/**
 * Portal del Médico — amplía los estados posibles de un turno.
 *
 * La restricción `turnos_estado_check` (migración 20261012000000) aceptaba
 * solo 'confirmado' y 'cancelado'. Ahora acepta además:
 *   - 'atendido':  el médico ya atendió al paciente.
 *   - 'pendiente': el médico lo dejó (o lo devolvió) a la espera de atención.
 *
 * El índice único parcial (profesional_id, fecha, hora) WHERE estado <>
 * 'cancelado' no cambia: 'atendido' y 'pendiente' siguen ocupando el horario.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint("turnos", "turnos_estado_check", {
        transaction,
      });
      await queryInterface.addConstraint("turnos", {
        fields: ["estado"],
        type: "check",
        where: {
          estado: ["confirmado", "cancelado", "atendido", "pendiente"],
        },
        name: "turnos_estado_check",
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
      // Antes de volver a la restricción original hay que migrar los datos
      // que ya no serían válidos.
      await queryInterface.sequelize.query(
        `UPDATE turnos SET estado = 'confirmado' WHERE estado IN ('atendido', 'pendiente');`,
        { transaction }
      );
      await queryInterface.removeConstraint("turnos", "turnos_estado_check", {
        transaction,
      });
      await queryInterface.addConstraint("turnos", {
        fields: ["estado"],
        type: "check",
        where: { estado: ["confirmado", "cancelado"] },
        name: "turnos_estado_check",
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
