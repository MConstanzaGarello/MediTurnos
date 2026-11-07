"use strict";

const bcrypt = require("bcrypt");

/**
 * Médico de prueba para el Portal del Médico.
 *
 *   Email:      roman.lopez@mediturnos.com
 *   Contraseña: Medico123
 *
 * Es idempotente: si el médico ya existe (por email o por nombre) lo
 * ACTUALIZA con todos sus datos; si no existe lo INSERTA. También crea la
 * especialidad "Clínica Médica" si todavía no está.
 *
 * Correrlo solo a él (el seeder inicial de HU-03 no es idempotente):
 *   npx sequelize-cli db:seed --seed 20261101000000-demo-medico-roman-lopez.js
 *
 * IMPORTANTE: solo para desarrollo. En un entorno real las credenciales las
 * da de alta un Administrativo.
 */

const MEDICO = {
  nombre: "Dr. Román López",
  email: "roman.lopez@mediturnos.com",
  password: "Medico123",
  matricula: "MP 28451",
  telefono: "3564 412345",
  diasAtencion: "Lunes a Viernes",
  info: "Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11.",
  especialidad: "Clínica Médica",
};

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(MEDICO.password, rounds);

    const transaction = await sequelize.transaction();
    try {
      // 1) Especialidad (la crea si no existe).
      await sequelize.query(
        `INSERT INTO especialidades (nombre, created_at, updated_at)
         VALUES (:nombre, :now, :now)
         ON CONFLICT (nombre) DO NOTHING;`,
        { replacements: { nombre: MEDICO.especialidad, now }, transaction }
      );
      const [[especialidad]] = await sequelize.query(
        `SELECT id FROM especialidades WHERE nombre = :nombre;`,
        { replacements: { nombre: MEDICO.especialidad }, transaction }
      );

      // 2) Médico: actualiza si ya existe, inserta si no.
      const [existentes] = await sequelize.query(
        `SELECT id FROM profesionales
          WHERE email = :email OR nombre = :nombre
          ORDER BY (email = :email) DESC, id ASC
          LIMIT 1;`,
        {
          replacements: { email: MEDICO.email, nombre: MEDICO.nombre },
          transaction,
        }
      );

      const datos = {
        nombre: MEDICO.nombre,
        email: MEDICO.email,
        password: passwordHash,
        matricula: MEDICO.matricula,
        telefono: MEDICO.telefono,
        diasAtencion: MEDICO.diasAtencion,
        info: MEDICO.info,
        especialidadId: especialidad.id,
        now,
      };

      if (existentes.length > 0) {
        await sequelize.query(
          `UPDATE profesionales
              SET nombre = :nombre, email = :email, password = :password,
                  matricula = :matricula, telefono = :telefono,
                  dias_atencion = :diasAtencion, info = :info,
                  especialidad_id = :especialidadId, updated_at = :now
            WHERE id = :id;`,
          { replacements: { ...datos, id: existentes[0].id }, transaction }
        );
      } else {
        await sequelize.query(
          `INSERT INTO profesionales
             (nombre, email, password, matricula, telefono, dias_atencion,
              info, especialidad_id, created_at, updated_at)
           VALUES
             (:nombre, :email, :password, :matricula, :telefono, :diasAtencion,
              :info, :especialidadId, :now, :now);`,
          { replacements: datos, transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    // Si el médico ya tiene turnos no se puede borrar (FK RESTRICT): en ese
    // caso solo se le quitan las credenciales para que no pueda iniciar sesión.
    const [filas] = await sequelize.query(
      `SELECT p.id, (SELECT COUNT(*) FROM turnos t WHERE t.profesional_id = p.id)::int AS turnos
         FROM profesionales p WHERE p.email = :email;`,
      { replacements: { email: MEDICO.email } }
    );
    const fila = filas[0];

    if (!fila) return;

    if (fila.turnos > 0) {
      await sequelize.query(
        `UPDATE profesionales SET email = NULL, password = NULL WHERE id = :id;`,
        { replacements: { id: fila.id } }
      );
    } else {
      await sequelize.query(`DELETE FROM profesionales WHERE id = :id;`, {
        replacements: { id: fila.id },
      });
    }
  },
};
