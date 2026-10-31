"use strict";

/**
 * HU-04 — Consultar mis turnos.
 *
 * Agrega la columna `estado` a la tabla turnos. La HU-04 pide mostrar el
 * estado de cada turno y la HU-05 (cancelar) lo necesita para marcar un
 * turno como cancelado sin borrarlo, así que se crea una sola vez acá y
 * la usan las dos historias.
 *
 * Valores posibles:
 *   - "confirmado": turno vigente (valor por defecto, también para los
 *     turnos que ya existían antes de esta migración).
 *   - "cancelado":  turno cancelado por el paciente (HU-05).
 *
 * Además se reemplaza la restricción UNIQUE (profesional_id, fecha, hora)
 * de HU-03 por un índice único PARCIAL que ignora los turnos cancelados.
 * Sin este cambio, un turno cancelado seguiría "ocupando" el horario a
 * nivel de base de datos y nadie más podría reservarlo (HU-05) ni moverse
 * a ese horario al reprogramar (HU-06). Se sigue garantizando que no haya
 * dos turnos vigentes para el mismo profesional, fecha y hora.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "turnos",
        "estado",
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "confirmado",
        },
        { transaction }
      );

      await queryInterface.addConstraint("turnos", {
        fields: ["estado"],
        type: "check",
        where: { estado: ["confirmado", "cancelado"] },
        name: "turnos_estado_check",
        transaction,
      });

      await queryInterface.removeConstraint(
        "turnos",
        "turnos_profesional_fecha_hora_unique",
        { transaction }
      );

      await queryInterface.addIndex("turnos", ["profesional_id", "fecha", "hora"], {
        unique: true,
        name: "turnos_profesional_fecha_hora_vigente_unique",
        where: { estado: { [Sequelize.Op.ne]: "cancelado" } },
        transaction,
      });

      // Acelera la consulta de "Mis turnos" (siempre filtra por paciente).
      await queryInterface.addIndex("turnos", ["paciente_id"], {
        name: "turnos_paciente_id_idx",
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
      await queryInterface.removeIndex("turnos", "turnos_paciente_id_idx", {
        transaction,
      });
      await queryInterface.removeIndex(
        "turnos",
        "turnos_profesional_fecha_hora_vigente_unique",
        { transaction }
      );
      // Para volver a la restricción original no puede haber dos turnos en
      // el mismo horario: se eliminan los cancelados que choquen.
      await queryInterface.sequelize.query(
        `DELETE FROM turnos t
          WHERE t.estado = 'cancelado'
            AND EXISTS (
              SELECT 1 FROM turnos o
               WHERE o.id <> t.id
                 AND o.profesional_id = t.profesional_id
                 AND o.fecha = t.fecha
                 AND o.hora = t.hora
            );`,
        { transaction }
      );
      await queryInterface.addConstraint("turnos", {
        fields: ["profesional_id", "fecha", "hora"],
        type: "unique",
        name: "turnos_profesional_fecha_hora_unique",
        transaction,
      });
      await queryInterface.removeConstraint("turnos", "turnos_estado_check", {
        transaction,
      });
      await queryInterface.removeColumn("turnos", "estado", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
