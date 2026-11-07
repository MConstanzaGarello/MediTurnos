/**
 * Portal del Médico — pruebas de integración: login único (paciente y
 * médico), dashboard por fecha, edición del perfil y reprogramación.
 *
 * Corren contra la API real (Express + middlewares + Sequelize) y la base
 * PostgreSQL de prueba creada con las migraciones (ver globalSetup.js).
 */

import request from "supertest";
import { createApp } from "../../src/app";
import { Especialidad, Paciente, Profesional, Turno, sequelize } from "../../src/db/models";
import { hashPassword } from "../../src/utils/password";
import { signSessionToken } from "../../src/utils/jwt";

const app = createApp();

const PASS_MEDICO = "Medico123";
const PASS_PACIENTE = "Paciente123!";

let medicoToken: string;
let pacienteToken: string;
let especialidad: Especialidad;
let medico: Profesional;
let otroMedico: Profesional;
let paciente: Paciente;

function fechaAR(offsetDias: number): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDias * 86400000)
    .toISOString()
    .slice(0, 10);
}

beforeAll(async () => {
  await sequelize.query(
    "TRUNCATE turnos, profesionales, especialidades, pacientes RESTART IDENTITY CASCADE"
  );

  especialidad = await Especialidad.create({ nombre: "Clínica Médica" });
  medico = await Profesional.create({
    nombre: "Dr. Román López",
    info: "Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11.",
    especialidadId: especialidad.id,
    email: "roman@test.com",
    password: await hashPassword(PASS_MEDICO),
    matricula: "MP 28451",
    telefono: "3564 412345",
    diasAtencion: "Lunes a Viernes",
  });
  // Profesional SIN credenciales: no puede iniciar sesión.
  otroMedico = await Profesional.create({
    nombre: "Dra. Sin Acceso",
    info: "Atiende martes.",
    especialidadId: especialidad.id,
  });
  paciente = await Paciente.create({
    nombre: "Ana",
    apellido: "Pérez",
    dni: "30111222",
    fechaNacimiento: "1990-05-10",
    email: "ana@test.com",
    telefono: "3564123456",
    password: await hashPassword(PASS_PACIENTE),
  });
  pacienteToken = signSessionToken({ pacienteId: paciente.id, email: paciente.email });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "roman@test.com", password: PASS_MEDICO });
  medicoToken = login.body.token;

  await Turno.bulkCreate([
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(-3), hora: "09:00", estado: "atendido" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(0), hora: "09:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(2), hora: "10:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: medico.id, fecha: fechaAR(2), hora: "11:00", estado: "confirmado" },
    { pacienteId: paciente.id, especialidadId: especialidad.id, profesionalId: otroMedico.id, fecha: fechaAR(0), hora: "09:00", estado: "confirmado" },
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /api/auth/login — login único", () => {
  it("un paciente entra y recibe rol 'paciente'", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: PASS_PACIENTE });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("paciente");
    expect(res.body.paciente.email).toBe("ana@test.com");
    expect(res.body.paciente.password).toBeUndefined();
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("un médico entra por el mismo endpoint y recibe rol 'medico'", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Roman@Test.com", password: PASS_MEDICO });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("medico");
    expect(res.body.medico).toMatchObject({
      id: medico.id,
      nombre: "Dr. Román López",
      especialidad: "Clínica Médica",
    });
    expect(res.body.medico.password).toBeUndefined();
  });

  it("correo que no existe -> 404", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@test.com", password: "x" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("El usuario no se encuentra registrado.");
  });

  it("contraseña incorrecta (médico o paciente) -> 401", async () => {
    for (const email of ["roman@test.com", "ana@test.com"]) {
      const res = await request(app).post("/api/auth/login").send({ email, password: "mala" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Correo electrónico o contraseña incorrectos.");
    }
  });

  it("el token de médico no sirve en rutas de paciente y viceversa", async () => {
    const a = await request(app).get("/api/turnos/mis-turnos").set("Authorization", `Bearer ${medicoToken}`);
    expect(a.status).toBe(401);
    const b = await request(app).get("/api/medicos/dashboard").set("Authorization", `Bearer ${pacienteToken}`);
    expect(b.status).toBe(401);
  });

  it("ya no existe un login especial de médico", async () => {
    const res = await request(app)
      .post("/api/auth/medico/login")
      .send({ email: "roman@test.com", password: PASS_MEDICO });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/medicos/dashboard?fecha=", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("sin fecha devuelve hoy", async () => {
    const res = await request(app).get("/api/medicos/dashboard").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe(fechaAR(0));
    expect(res.body.hoy).toBe(fechaAR(0));
    expect(res.body.turnos).toHaveLength(1);
    expect(res.body.metricas.turnosHoy).toBe(1);
  });

  it("una fecha anterior devuelve los turnos de ese día", async () => {
    const res = await request(app).get(`/api/medicos/dashboard?fecha=${fechaAR(-3)}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe(fechaAR(-3));
    expect(res.body.metricas.atendidos).toBe(1);
    expect(res.body.turnos[0].paciente.apellido).toBe("Pérez");
  });

  it("una fecha futura devuelve los turnos de ese día, ordenados por hora, y solo los del médico", async () => {
    const res = await request(app).get(`/api/medicos/dashboard?fecha=${fechaAR(2)}`).set(auth());
    expect(res.body.turnos.map((t: { hora: string }) => t.hora)).toEqual(["10:00", "11:00"]);
    expect(res.body.metricas.confirmados).toBe(2);
  });

  it("fecha inválida -> 400", async () => {
    for (const f of ["hola", "2026-02-31", "2026-1-1"]) {
      const res = await request(app).get(`/api/medicos/dashboard?fecha=${f}`).set(auth());
      expect(res.status).toBe(400);
    }
  });
});

describe("PATCH /api/medicos/perfil", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("actualiza días de atención y horario/detalle", async () => {
    const res = await request(app)
      .patch("/api/medicos/perfil")
      .set(auth())
      .send({ diasAtencion: "  Martes y Jueves ", info: "Atiende de 9 a 13 hs. Consultorio N° 4." });
    expect(res.status).toBe(200);
    expect(res.body.perfil.diasAtencion).toBe("Martes y Jueves");
    expect(res.body.perfil.info).toBe("Atiende de 9 a 13 hs. Consultorio N° 4.");

    const get = await request(app).get("/api/medicos/perfil").set(auth());
    expect(get.body.perfil.diasAtencion).toBe("Martes y Jueves");
    // Lo demás no se toca.
    expect(get.body.perfil.matricula).toBe("MP 28451");
  });

  it("campos vacíos o demasiado largos -> 400 y no cambia nada", async () => {
    const vacio = await request(app).patch("/api/medicos/perfil").set(auth()).send({ diasAtencion: " ", info: "" });
    expect(vacio.status).toBe(400);
    expect(vacio.body.errors).toEqual({
      diasAtencion: "Ingrese los días de atención.",
      info: "Ingrese el horario y detalle de atención.",
    });

    const largo = await request(app)
      .patch("/api/medicos/perfil")
      .set(auth())
      .send({ diasAtencion: "Lunes", info: "x".repeat(256) });
    expect(largo.status).toBe(400);

    const get = await request(app).get("/api/medicos/perfil").set(auth());
    expect(get.body.perfil.diasAtencion).toBe("Martes y Jueves");
  });

  it("sin token de médico -> 401", async () => {
    const res = await request(app)
      .patch("/api/medicos/perfil")
      .set("Authorization", `Bearer ${pacienteToken}`)
      .send({ diasAtencion: "Lunes", info: "x" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/turnos/:id/reprogramar-medico", () => {
  const auth = () => ({ Authorization: `Bearer ${medicoToken}` });

  it("reprograma un turno futuro y conserva el estado", async () => {
    const turno = await Turno.findOne({ where: { profesionalId: medico.id, fecha: fechaAR(2), hora: "10:00" } });
    const res = await request(app)
      .put(`/api/turnos/${turno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "14:00" });
    expect(res.status).toBe(200);
    expect(res.body.turno).toMatchObject({ fecha: fechaAR(5), hora: "14:00", estado: "confirmado" });
  });

  it("horario ocupado -> 409", async () => {
    const turno = await Turno.findOne({ where: { profesionalId: medico.id, fecha: fechaAR(2), hora: "11:00" } });
    const res = await request(app)
      .put(`/api/turnos/${turno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "14:00" });
    expect(res.status).toBe(409);
  });

  it("turno de otro médico -> 404", async () => {
    const ajeno = await Turno.findOne({ where: { profesionalId: otroMedico.id } });
    const res = await request(app)
      .put(`/api/turnos/${ajeno!.id}/reprogramar-medico`)
      .set(auth())
      .send({ fecha: fechaAR(5), hora: "15:00" });
    expect(res.status).toBe(404);
  });
});
