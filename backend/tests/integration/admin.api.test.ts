/**
 * HU-11 y HU-12 — Pruebas de integración de la API del administrador
 * (login por rol, control de acceso, dashboard, alta de médico, cambio de
 * especialidad y reportes) contra la base PostgreSQL de prueba.
 */
import request from "supertest";
import { createApp } from "../../src/app";
import {
  Administrador,
  Especialidad,
  ObraSocial,
  Paciente,
  Profesional,
  Turno,
  sequelize,
} from "../../src/db/models";
import { hashPassword } from "../../src/utils/password";
import { signSessionToken } from "../../src/utils/jwt";
import { fechaHoyArgentina } from "../../src/utils/fecha";

const app = createApp();

let admin: Administrador;
let adminToken: string;
let pacienteToken: string;
let cardiologia: Especialidad;
let pediatria: Especialidad;
let gomez: Profesional;
let osde: ObraSocial;
let pami: ObraSocial;
const hoy = fechaHoyArgentina();
const mesActual = hoy.slice(0, 7);

const altaValida = () => ({
  nombre: "Román",
  apellido: "Pérez",
  matricula: "12345",
  email: "romanperez@mediturnos.com",
  especialidadId: cardiologia.id,
  obrasSocialesIds: [osde.id, pami.id],
  precioParticular: 25000,
  passwordTemporal: "Temporal123",
});

const conAdmin = (r: request.Test) => r.set("Authorization", `Bearer ${adminToken}`);

beforeAll(async () => {
  await sequelize.query(
    "TRUNCATE turnos, profesionales, especialidades, pacientes, administradores RESTART IDENTITY CASCADE"
  );

  [osde, pami] = await Promise.all([
    ObraSocial.findOne({ where: { nombre: "OSDE" } }) as Promise<ObraSocial>,
    ObraSocial.findOne({ where: { nombre: "PAMI" } }) as Promise<ObraSocial>,
  ]);

  admin = await Administrador.create({
    nombre: "Ada",
    apellido: "Admin",
    email: "admin@mediturnos.com",
    password: await hashPassword("Admin1234"),
  });
  adminToken = signSessionToken({ rol: "admin", adminId: admin.id, email: admin.email });

  const paciente = await Paciente.create({
    nombre: "Lucía",
    apellido: "Prueba",
    dni: "40123456",
    fechaNacimiento: "1990-05-10",
    email: "lucia@test.com",
    telefono: "3564123456",
    password: await hashPassword("Clave1234"),
  });
  pacienteToken = signSessionToken({ rol: "paciente", pacienteId: paciente.id, email: paciente.email });

  cardiologia = await Especialidad.create({ nombre: "Cardiología" });
  pediatria = await Especialidad.create({ nombre: "Pediatría" });
  gomez = await Profesional.create({
    nombre: "Dr. Martín Gómez",
    info: "Atiende lunes y miércoles de 10 a 14 hs.",
    especialidadId: cardiologia.id,
  });

  await Turno.bulkCreate([
    { pacienteId: paciente.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: hoy, hora: "10:00" },
    { pacienteId: paciente.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: hoy, hora: "09:00" },
    { pacienteId: paciente.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: hoy, hora: "11:00", estado: "cancelado" },
    { pacienteId: paciente.id, especialidadId: cardiologia.id, profesionalId: gomez.id, fecha: "2020-01-15", hora: "09:00" },
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe("Login por rol (HU-02 + HU-11)", () => {
  it("el administrador ingresa y recibe rol admin + token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ADMIN@mediturnos.com", password: "Admin1234" });

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("admin");
    expect(res.body.admin).toEqual({ id: admin.id, nombre: "Ada", apellido: "Admin", email: "admin@mediturnos.com" });
    expect(res.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("contraseña de administrador incorrecta -> 401 con el mensaje de HU-02", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@mediturnos.com", password: "otra" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Correo electrónico o contraseña incorrectos.");
  });

  it("el paciente sigue ingresando igual (rol paciente)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "lucia@test.com", password: "Clave1234" });

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("paciente");
    expect(res.body.paciente.email).toBe("lucia@test.com");
  });
});

describe("Control de acceso por rol", () => {
  it("sin sesión -> 401 en las rutas del administrador", async () => {
    for (const url of ["/api/admin/dashboard", "/api/admin/medicos", "/api/admin/reportes"]) {
      expect((await request(app).get(url)).status).toBe(401);
    }
  });

  it("un paciente con sesión válida -> 403", async () => {
    const res = await request(app).get("/api/admin/dashboard").set("Authorization", `Bearer ${pacienteToken}`);
    expect(res.status).toBe(403);
  });

  it("token de administrador no sirve para rutas de paciente", async () => {
    const res = await request(app).get("/api/turnos/mis-turnos").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/dashboard (HU-11)", () => {
  it("resume los turnos de hoy y los lista ordenados por hora", async () => {
    const res = await conAdmin(request(app).get("/api/admin/dashboard"));

    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe(hoy);
    expect(res.body.resumen).toEqual({ total: 3, confirmados: 2, cancelados: 1 });
    expect(res.body.turnos.map((t: { hora: string }) => t.hora)).toEqual(["09:00", "10:00", "11:00"]);
    expect(res.body.turnos[0]).toEqual({
      id: expect.any(Number),
      hora: "09:00",
      paciente: "Prueba, Lucía",
      dni: "40123456",
      profesional: "Dr. Martín Gómez",
      especialidad: "Cardiología",
      estado: "confirmado",
    });
  });
});

describe("Alta de médico (HU-11)", () => {
  it("crea el médico con obras sociales, precio y agenda inicial", async () => {
    const res = await conAdmin(request(app).post("/api/admin/medicos")).send(altaValida());

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Médico dado de alta correctamente.");
    expect(res.body.medico).toMatchObject({
      nombre: "Román Pérez",
      matricula: "12345",
      email: "romanperez@mediturnos.com",
      precioParticular: 25000,
      especialidad: "Cardiología",
      info: "Atiende lunes a viernes de 8 a 12 hs.",
      obrasSociales: [
        { id: osde.id, nombre: "OSDE" },
        { id: pami.id, nombre: "PAMI" },
      ],
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    // La contraseña temporal quedó hasheada, no en texto plano.
    const guardado = await Profesional.findOne({ where: { email: "romanperez@mediturnos.com" } });
    expect(guardado?.password).toBeTruthy();
    expect(guardado?.password).not.toBe("Temporal123");
  });

  it("el médico dado de alta puede iniciar sesión con la contraseña temporal", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "romanperez@mediturnos.com", password: "Temporal123" });

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe("medico");
    expect(res.body.medico.email).toBe("romanperez@mediturnos.com");
  });

  it("aparece al pedir turno (listado público de profesionales)", async () => {
    const res = await request(app).get(`/api/profesionales?especialidadId=${cardiologia.id}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("Román Pérez");
  });

  it("matrícula o correo repetidos -> 409", async () => {
    const res = await conAdmin(request(app).post("/api/admin/medicos")).send(altaValida());

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("El médico ya se encuentra registrado.");
    expect(res.body.errors.matricula).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
  });

  it("correo de paciente (fuera del dominio @mediturnos.com) -> 400", async () => {
    const res = await conAdmin(request(app).post("/api/admin/medicos")).send({
      ...altaValida(),
      matricula: "99999",
      email: "lucia@test.com",
    });
    // El dominio no es @mediturnos.com: se rechaza antes por validación.
    expect(res.status).toBe(400);
  });

  it("correo ya usado por un administrador -> 409", async () => {
    const res = await conAdmin(request(app).post("/api/admin/medicos")).send({
      ...altaValida(),
      matricula: "99999",
      email: "admin@mediturnos.com",
    });
    expect(res.status).toBe(409);
    expect(res.body.errors.email).toBeDefined();
  });

  it("datos inválidos -> 400 con el detalle por campo y no guarda nada", async () => {
    const antes = await Profesional.count();
    const res = await conAdmin(request(app).post("/api/admin/medicos")).send({
      ...altaValida(),
      email: "roman@gmail.com",
      precioParticular: 0,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.precioParticular).toBeDefined();
    expect(await Profesional.count()).toBe(antes);
  });

  it("especialidad u obra social inexistente -> 400", async () => {
    const a = await conAdmin(request(app).post("/api/admin/medicos")).send({
      ...altaValida(), matricula: "55555", email: "otro@mediturnos.com", especialidadId: 9999,
    });
    expect(a.status).toBe(400);
    expect(a.body.errors.especialidadId).toBeDefined();

    const b = await conAdmin(request(app).post("/api/admin/medicos")).send({
      ...altaValida(), matricula: "55555", email: "otro@mediturnos.com", obrasSocialesIds: [9999],
    });
    expect(b.status).toBe(400);
    expect(b.body.errors.obrasSocialesIds).toBeDefined();
  });

  it("lista los médicos y las obras sociales disponibles", async () => {
    const medicos = await conAdmin(request(app).get("/api/admin/medicos"));
    expect(medicos.status).toBe(200);
    expect(medicos.body.map((m: { nombre: string }) => m.nombre)).toEqual(["Dr. Martín Gómez", "Román Pérez"]);

    const obras = await conAdmin(request(app).get("/api/admin/obras-sociales"));
    expect(obras.status).toBe(200);
    expect(obras.body.length).toBeGreaterThanOrEqual(8);
  });
});

describe("Cambio de especialidad (HU-11)", () => {
  it("el administrador cambia la especialidad de un médico", async () => {
    const res = await conAdmin(request(app).patch(`/api/admin/medicos/${gomez.id}/especialidad`)).send({
      especialidadId: pediatria.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Especialidad actualizada correctamente.");
    expect(res.body.medico.especialidad).toBe("Pediatría");
    expect((await Profesional.findByPk(gomez.id))?.especialidadId).toBe(pediatria.id);
  });

  it("médico o especialidad inexistente, o id inválido", async () => {
    const sinMedico = await conAdmin(request(app).patch("/api/admin/medicos/9999/especialidad")).send({
      especialidadId: pediatria.id,
    });
    expect(sinMedico.status).toBe(404);

    const sinEsp = await conAdmin(request(app).patch(`/api/admin/medicos/${gomez.id}/especialidad`)).send({
      especialidadId: 9999,
    });
    expect(sinEsp.status).toBe(400);

    const invalido = await conAdmin(request(app).patch(`/api/admin/medicos/${gomez.id}/especialidad`)).send({});
    expect(invalido.status).toBe(400);
  });

  it("un paciente no puede cambiarla (403)", async () => {
    const res = await request(app)
      .patch(`/api/admin/medicos/${gomez.id}/especialidad`)
      .set("Authorization", `Bearer ${pacienteToken}`)
      .send({ especialidadId: cardiologia.id });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/reportes (HU-12)", () => {
  it("sin parámetro devuelve el mes actual", async () => {
    const res = await conAdmin(request(app).get("/api/admin/reportes"));

    expect(res.status).toBe(200);
    expect(res.body.mes).toBe(mesActual);
    expect(res.body.totales.total).toBe(3);
    expect(res.body.totales.cancelados).toBe(1);
    expect(res.body.totales.tasaCancelacion).toBe(33);
  });

  it("filtra por mes: enero de 2020 tiene 1 turno realizado", async () => {
    const res = await conAdmin(request(app).get("/api/admin/reportes?mes=2020-01"));

    expect(res.status).toBe(200);
    expect(res.body.totales).toEqual({ total: 1, realizados: 1, proximos: 0, cancelados: 0, tasaCancelacion: 0 });
    expect(res.body.porEspecialidad).toEqual([{ especialidad: "Cardiología", cantidad: 1 }]);
    expect(res.body.profesionales[0]).toMatchObject({ nombre: "Dr. Martín Gómez", confirmados: 1, cancelados: 0 });
  });

  it("mes sin turnos -> todo en cero", async () => {
    const res = await conAdmin(request(app).get("/api/admin/reportes?mes=2019-06"));
    expect(res.status).toBe(200);
    expect(res.body.totales.total).toBe(0);
    expect(res.body.franjas).toHaveLength(4);
  });

  it.each(["2026-13", "2026-1", "hola", "2026/11"])("mes inválido %s -> 400", async (mes) => {
    const res = await conAdmin(request(app).get(`/api/admin/reportes?mes=${mes}`));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("El mes indicado no es válido.");
  });

  it("un paciente no accede (403)", async () => {
    const res = await request(app).get("/api/admin/reportes").set("Authorization", `Bearer ${pacienteToken}`);
    expect(res.status).toBe(403);
  });
});
