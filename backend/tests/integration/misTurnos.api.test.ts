/**
 * HU-04 — Pruebas de integración de GET /api/turnos/mis-turnos.
 *
 * Recorren la API real (Express + requireAuth + Sequelize) contra la base
 * PostgreSQL de prueba, creada con las migraciones (ver globalSetup.js).
 * Cubren los casos CP-31 a CP-35 del Plan de pruebas a nivel API y el
 * control de acceso (CNF-02).
 */

import request from "supertest";
import { UniqueConstraintError } from "sequelize";
import { createApp } from "../../src/app";
import { Especialidad, Paciente, Profesional, Turno, sequelize } from "../../src/db/models";
import { signSessionToken } from "../../src/utils/jwt";

const app = createApp();
const URL = "/api/turnos/mis-turnos";

let pacienteA: Paciente;
let pacienteB: Paciente;
let tokenA: string;
let tokenB: string;
let cardiologia: Especialidad;
let pediatria: Especialidad;
let gomez: Profesional;
let ramirez: Profesional;

async function crearPaciente(nombre: string, dni: string, email: string) {
  return Paciente.create({
    nombre,
    apellido: "Prueba",
    dni,
    fechaNacimiento: "1990-05-10",
    email,
    telefono: "3564123456",
    password: "hash-de-prueba",
  });
}

beforeAll(async () => {
  await sequelize.query(
    "TRUNCATE turnos, profesionales, especialidades, pacientes RESTART IDENTITY CASCADE"
  );

  cardiologia = await Especialidad.create({ nombre: "Cardiología" });
  pediatria = await Especialidad.create({ nombre: "Pediatría" });
  gomez = await Profesional.create({
    nombre: "Dr. Martín Gómez",
    info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
    especialidadId: cardiologia.id,
  });
  ramirez = await Profesional.create({
    nombre: "Dra. Sofía Ramírez",
    info: "Atiende lunes a viernes de 8 a 12 hs. Consultorio N° 1.",
    especialidadId: pediatria.id,
  });

  pacienteA = await crearPaciente("Lucía", "40123456", "lucia@test.com");
  pacienteB = await crearPaciente("Bruno", "40999888", "bruno@test.com");
  tokenA = signSessionToken({ pacienteId: pacienteA.id, email: pacienteA.email });
  tokenB = signSessionToken({ pacienteId: pacienteB.id, email: pacienteB.email });

  // Turnos del paciente A cargados DESORDENADOS a propósito (CP-33).
  await Turno.bulkCreate([
    { pacienteId: pacienteA.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: "2026-11-20", hora: "10:30" },
    { pacienteId: pacienteA.id, especialidadId: pediatria.id, profesionalId: ramirez.id, fecha: "2026-11-14", hora: "11:30" },
    { pacienteId: pacienteA.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: "2026-11-14", hora: "09:00" },
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe("GET /api/turnos/mis-turnos (HU-04)", () => {
  it("CP-31: lista los turnos propios con especialidad, profesional, fecha, horario y estado", async () => {
    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.turnos).toHaveLength(3);
    expect(res.body.turnos[0]).toEqual({
      id: expect.any(Number),
      fecha: "2026-11-14",
      hora: "09:00",
      estado: "confirmado",
      especialidad: { id: cardiologia.id, nombre: "Cardiología" },
      profesional: {
        id: gomez.id,
        nombre: "Dr. Martín Gómez",
        info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
      },
    });
  });

  it("CP-32: un paciente no ve los turnos de otro", async () => {
    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.turnos).toEqual([]);
  });

  it("CP-32: no acepta elegir el paciente por la URL", async () => {
    const res = await request(app)
      .get(`${URL}?pacienteId=${pacienteA.id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.turnos).toEqual([]);
  });

  it("CP-33: devuelve los turnos ordenados por fecha y hora", async () => {
    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenA}`);

    const orden = res.body.turnos.map((t: { fecha: string; hora: string }) => `${t.fecha} ${t.hora}`);
    expect(orden).toEqual(["2026-11-14 09:00", "2026-11-14 11:30", "2026-11-20 10:30"]);
  });

  it("CP-34: paciente sin turnos recibe una lista vacía", async () => {
    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ turnos: [] });
  });

  it("CP-35: si falla la base responde 500 sin exponer detalles técnicos", async () => {
    const espia = jest
      .spyOn(Turno, "findAll")
      .mockRejectedValueOnce(new Error('relation "turnos" does not exist'));
    const silenciar = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/relation|turnos" does not exist/);
    espia.mockRestore();
    silenciar.mockRestore();
  });

  it("CNF-02: sin sesión responde 401", async () => {
    const res = await request(app).get(URL);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Debe iniciar sesión para continuar.");
  });

  it("CNF-02: con un token inválido responde 401", async () => {
    const res = await request(app).get(URL).set("Authorization", "Bearer token-invalido");

    expect(res.status).toBe(401);
  });

  it("muestra el estado cancelado de un turno (preparado para HU-05)", async () => {
    const turno = await Turno.create({
      pacienteId: pacienteB.id,
      especialidadId: cardiologia.id,
      profesionalId: gomez.id,
      fecha: "2026-12-01",
      hora: "10:00",
      estado: "cancelado",
    });

    const res = await request(app).get(URL).set("Authorization", `Bearer ${tokenB}`);

    expect(res.body.turnos).toEqual([expect.objectContaining({ id: turno.id, estado: "cancelado" })]);
    await turno.destroy();
  });
});

describe("Migración de estado (HU-04, usada por HU-05 y HU-06)", () => {
  const horario = { fecha: "2026-12-10", hora: "11:00" };

  afterEach(async () => {
    await Turno.destroy({ where: horario });
  });

  it("los turnos nuevos quedan en estado confirmado por defecto", async () => {
    const turno = await Turno.create({
      pacienteId: pacienteA.id,
      especialidadId: cardiologia.id,
      profesionalId: gomez.id,
      ...horario,
    });
    await turno.reload();

    expect(turno.estado).toBe("confirmado");
  });

  it("sigue impidiendo dos turnos vigentes en el mismo horario", async () => {
    const base = { especialidadId: cardiologia.id, profesionalId: gomez.id, ...horario };
    await Turno.create({ ...base, pacienteId: pacienteA.id });

    await expect(Turno.create({ ...base, pacienteId: pacienteB.id })).rejects.toBeInstanceOf(
      UniqueConstraintError
    );
  });

  it("un turno cancelado libera el horario para otro paciente", async () => {
    const base = { especialidadId: cardiologia.id, profesionalId: gomez.id, ...horario };
    await Turno.create({ ...base, pacienteId: pacienteA.id, estado: "cancelado" });

    await expect(Turno.create({ ...base, pacienteId: pacienteB.id })).resolves.toBeDefined();
  });

  it("rechaza estados que no existen", async () => {
    await expect(
      sequelize.query(
        `INSERT INTO turnos (paciente_id, especialidad_id, profesional_id, fecha, hora, estado)
         VALUES (${pacienteA.id}, ${cardiologia.id}, ${gomez.id}, '${horario.fecha}', '${horario.hora}', 'perdido')`
      )
    ).rejects.toThrow(/turnos_estado_check/);
  });
});
