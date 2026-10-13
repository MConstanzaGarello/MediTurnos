/**
 * HU-04 — Pruebas unitarias del service de "Mis turnos".
 * Se reemplaza el modelo Turno por un doble, así que no usan base de datos.
 */

const findAll = jest.fn();

jest.mock("../../src/db/models", () => ({
  Turno: { findAll: (...args: unknown[]) => findAll(...args) },
  Especialidad: { name: "Especialidad" },
  Profesional: { name: "Profesional" },
}));

import { getTurnosDelPaciente } from "../../src/modules/turnos/turno.service";
import { Especialidad, Profesional } from "../../src/db/models";

function filaTurno(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    pacienteId: 7,
    especialidadId: 1,
    profesionalId: 2,
    fecha: "2026-10-14",
    hora: "11:30",
    estado: "confirmado",
    Especialidad: { nombre: "Cardiología" },
    Profesional: {
      nombre: "Dr. Martín Gómez",
      info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
    },
    ...overrides,
  };
}

describe("getTurnosDelPaciente (HU-04)", () => {
  beforeEach(() => findAll.mockReset());

  it("filtra por el paciente recibido y ordena por fecha y hora ascendente", async () => {
    findAll.mockResolvedValue([]);

    await getTurnosDelPaciente(7);

    expect(findAll).toHaveBeenCalledTimes(1);
    const opciones = findAll.mock.calls[0][0];
    expect(opciones.where).toEqual({ pacienteId: 7 });
    expect(opciones.order).toEqual([
      ["fecha", "ASC"],
      ["hora", "ASC"],
      ["id", "ASC"],
    ]);
  });

  it("incluye la especialidad y el profesional de cada turno", async () => {
    findAll.mockResolvedValue([]);

    await getTurnosDelPaciente(7);

    const modelos = findAll.mock.calls[0][0].include.map(
      (i: { model: unknown }) => i.model
    );
    expect(modelos).toEqual([Especialidad, Profesional]);
  });

  it("devuelve especialidad, profesional, fecha, horario y estado de cada turno", async () => {
    findAll.mockResolvedValue([filaTurno()]);

    const turnos = await getTurnosDelPaciente(7);

    expect(turnos).toEqual([
      {
        id: 10,
        fecha: "2026-10-14",
        hora: "11:30",
        estado: "confirmado",
        especialidad: { id: 1, nombre: "Cardiología" },
        profesional: {
          id: 2,
          nombre: "Dr. Martín Gómez",
          info: "Atiende lunes y miércoles de 10 a 14 hs. Consultorio N° 7.",
        },
      },
    ]);
  });

  it("no expone el pacienteId ni datos de otros modelos en la respuesta", async () => {
    findAll.mockResolvedValue([filaTurno()]);

    const [turno] = await getTurnosDelPaciente(7);

    expect(turno).not.toHaveProperty("pacienteId");
    expect(turno).not.toHaveProperty("createdAt");
  });

  it("devuelve una lista vacía si el paciente no tiene turnos", async () => {
    findAll.mockResolvedValue([]);

    await expect(getTurnosDelPaciente(7)).resolves.toEqual([]);
  });

  it("propaga los errores de la base para que el middleware responda 500", async () => {
    findAll.mockRejectedValue(new Error("connection refused"));

    await expect(getTurnosDelPaciente(7)).rejects.toThrow("connection refused");
  });
});
