import { describe, expect, it } from "vitest";
import { filtrarTurnos, formatearFechaLarga } from "./dashboard";
import type { TurnoDashboard } from "@/lib/types/admin";

const turnos: TurnoDashboard[] = [
  { id: 1, hora: "08:00", paciente: "García, Lucas", dni: "38241112", profesional: "Dr. Ramón López", especialidad: "Clínica Médica", estado: "confirmado" },
  { id: 2, hora: "09:00", paciente: "Pérez, Sofía", dni: "40112983", profesional: "Dra. Laura Paz", especialidad: "Pediatría", estado: "cancelado" },
  { id: 3, hora: "10:00", paciente: "Martínez, Carlos", dni: "35774201", profesional: "Dr. Martín Gómez", especialidad: "Cardiología", estado: "confirmado" },
];

describe("filtrarTurnos (HU-11)", () => {
  it("'todos' sin búsqueda devuelve todo", () => {
    expect(filtrarTurnos(turnos, "todos", "")).toHaveLength(3);
  });

  it("filtra por estado", () => {
    expect(filtrarTurnos(turnos, "cancelado", "").map((t) => t.id)).toEqual([2]);
    expect(filtrarTurnos(turnos, "confirmado", "").map((t) => t.id)).toEqual([1, 3]);
  });

  it("busca sin distinguir mayúsculas ni tildes (paciente, DNI, médico, especialidad)", () => {
    expect(filtrarTurnos(turnos, "todos", "PEREZ").map((t) => t.id)).toEqual([2]);
    expect(filtrarTurnos(turnos, "todos", "351").map((t) => t.id)).toEqual([]);
    expect(filtrarTurnos(turnos, "todos", "35774").map((t) => t.id)).toEqual([3]);
    expect(filtrarTurnos(turnos, "todos", "cardiologia").map((t) => t.id)).toEqual([3]);
    expect(filtrarTurnos(turnos, "todos", "ramon").map((t) => t.id)).toEqual([1]);
  });

  it("combina estado y búsqueda", () => {
    expect(filtrarTurnos(turnos, "confirmado", "perez")).toEqual([]);
  });
});

describe("formatearFechaLarga", () => {
  it("escribe la fecha en español", () => {
    const texto = formatearFechaLarga("2026-11-05");
    expect(texto).toContain("5");
    expect(texto.toLowerCase()).toContain("noviembre");
    expect(texto).toContain("2026");
  });
});
