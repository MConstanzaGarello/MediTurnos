// HU-04 — Pruebas unitarias de la lógica de "Mis turnos".
import { describe, expect, it } from "vitest";
import type { MiTurno } from "@/lib/types/turno";
import {
  clasificarTurnos,
  extraerConsultorio,
  formatearFecha,
  hoyISO,
  MENSAJE_ERROR_TURNOS,
  MENSAJE_SIN_TURNOS,
  mensajeSinTurnos,
  ordenarTurnos,
  partesFecha,
} from "./misTurnos";

function turno(id: number, fecha: string, hora: string, estado: MiTurno["estado"] = "confirmado"): MiTurno {
  return {
    id,
    fecha,
    hora,
    estado,
    especialidad: { id: 1, nombre: "Cardiología" },
    profesional: { id: 1, nombre: "Dr. Martín Gómez", info: "Consultorio N° 7." },
  };
}

describe("mensajes de los criterios de aceptación", () => {
  it("usa los textos exactos de la HU-04", () => {
    expect(MENSAJE_SIN_TURNOS).toBe("No posee turnos programados.");
    expect(MENSAJE_ERROR_TURNOS).toBe("No fue posible obtener los turnos.");
  });

  it("muestra 'No posee turnos programados.' cuando no hay próximos", () => {
    expect(mensajeSinTurnos("proximos")).toBe("No posee turnos programados.");
    expect(mensajeSinTurnos("cancelados")).toBe("No posee turnos cancelados.");
  });
});

describe("ordenarTurnos (CP-33)", () => {
  it("ordena por fecha y, en el mismo día, por hora", () => {
    const desordenados = [
      turno(1, "2026-10-20", "10:30"),
      turno(2, "2026-10-14", "11:30"),
      turno(3, "2026-10-14", "09:00"),
    ];

    expect(ordenarTurnos(desordenados).map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it("no modifica el arreglo original", () => {
    const original = [turno(1, "2026-10-20", "10:30"), turno(2, "2026-10-14", "09:00")];
    ordenarTurnos(original);
    expect(original.map((t) => t.id)).toEqual([1, 2]);
  });
});

describe("clasificarTurnos", () => {
  const hoy = "2026-10-12";
  const turnos = [
    turno(1, "2026-10-20", "10:30"),
    turno(2, "2026-10-12", "08:00"), // hoy: es próximo
    turno(3, "2026-10-01", "09:00"), // pasado: va al Historial (HU-07)
    turno(4, "2026-10-15", "09:00", "cancelado"),
    turno(5, "2026-09-01", "09:00", "cancelado"),
  ];

  it("Próximos: confirmados de hoy en adelante, ordenados", () => {
    expect(clasificarTurnos(turnos, hoy).proximos.map((t) => t.id)).toEqual([2, 1]);
  });

  it("Cancelados: todos los cancelados, ordenados", () => {
    expect(clasificarTurnos(turnos, hoy).cancelados.map((t) => t.id)).toEqual([5, 4]);
  });

  it("sin turnos devuelve las dos pestañas vacías", () => {
    expect(clasificarTurnos([], hoy)).toEqual({ proximos: [], cancelados: [] });
  });
});

describe("formato", () => {
  it("formatea la fecha como dd/mm/aaaa", () => {
    expect(formatearFecha("2026-10-14")).toBe("14/10/2026");
  });

  it("arma el recuadro de la tarjeta con día y mes", () => {
    expect(partesFecha("2026-10-04")).toEqual({ dia: "4", mes: "OCT" });
    expect(partesFecha("2026-01-31")).toEqual({ dia: "31", mes: "ENE" });
  });

  it("calcula hoy en formato YYYY-MM-DD con la hora local", () => {
    expect(hoyISO(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
  });

  it("extrae el consultorio del texto del profesional", () => {
    expect(extraerConsultorio("Atiende lunes de 10 a 14 hs. Consultorio N° 7.")).toBe(
      "Consultorio N° 7"
    );
    expect(extraerConsultorio("Atiende lunes de 10 a 14 hs.")).toBeNull();
  });
});
