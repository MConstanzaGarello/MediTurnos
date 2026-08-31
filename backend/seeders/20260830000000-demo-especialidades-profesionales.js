"use strict";

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const especialidades = [
      "Cardiología",
      "Pediatría",
      "Dermatología",
      "Clínica Médica",
      "Traumatología",
    ];

    await queryInterface.bulkInsert(
      "especialidades",
      especialidades.map((nombre) => ({
        nombre,
        created_at: now,
        updated_at: now,
      }))
    );

    const filas = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM especialidades;`
    );
    const especialidadIds = filas[0].reduce((acc, row) => {
      acc[row.nombre] = row.id;
      return acc;
    }, {});

    const profesionales = [
      {
        nombre: "Dr. Martín Gómez",
        info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
        especialidad: "Cardiología",
      },
      {
        nombre: "Dra. Lucía Fernández",
        info: "Atiende martes y jueves de 9 a 13 hs. Consultorio N° 3.",
        especialidad: "Cardiología",
      },
      {
        nombre: "Dra. Sofía Ramírez",
        info: "Atiende lunes a viernes de 8 a 12 hs. Consultorio N° 1.",
        especialidad: "Pediatría",
      },
      {
        nombre: "Dr. Ezequiel Torres",
        info: "Atiende martes y jueves de 14 a 18 hs. Consultorio N° 5.",
        especialidad: "Pediatría",
      },
      {
        nombre: "Dra. Valentina López",
        info: "Atiende miércoles y viernes de 10 a 14 hs. Consultorio N° 4.",
        especialidad: "Dermatología",
      },
      {
        nombre: "Dr. Federico Sosa",
        info: "Atiende lunes de 9 a 13 hs. Consultorio N° 6.",
        especialidad: "Dermatología",
      },
      {
        nombre: "Dr. Nicolás Herrera",
        info: "Atiende lunes a viernes de 8 a 12 hs. Consultorio N° 2.",
        especialidad: "Clínica Médica",
      },
      {
        nombre: "Dra. Camila Ibáñez",
        info: "Atiende martes y jueves de 14 a 18 hs. Consultorio N° 8.",
        especialidad: "Clínica Médica",
      },
      {
        nombre: "Dr. Agustín Molina",
        info: "Atiende lunes, miércoles y viernes de 9 a 13 hs. Consultorio N° 9.",
        especialidad: "Traumatología",
      },
      {
        nombre: "Dra. Julieta Acosta",
        info: "Atiende martes de 10 a 14 hs. Consultorio N° 10.",
        especialidad: "Traumatología",
      },
    ];

    await queryInterface.bulkInsert(
      "profesionales",
      profesionales.map((p) => ({
        nombre: p.nombre,
        info: p.info,
        especialidad_id: especialidadIds[p.especialidad],
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("profesionales", null, {});
    await queryInterface.bulkDelete("especialidades", null, {});
  },
};
