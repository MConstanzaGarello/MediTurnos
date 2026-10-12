// HU-04 — Pruebas del servicio getMisTurnos (consumo de la API).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tokenActual: string | null = "token-de-prueba";
vi.mock("@/lib/auth/session", () => ({
  getToken: () => tokenActual,
}));

import { getMisTurnos, TurnoRequestError } from "./turnoService";

const fetchMock = vi.fn();

function respuesta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const unTurno = {
  id: 1,
  fecha: "2026-10-14",
  hora: "11:30",
  estado: "confirmado",
  especialidad: { id: 1, nombre: "Cardiología" },
  profesional: { id: 1, nombre: "Dr. Martín Gómez", info: "Consultorio N° 7." },
};

beforeEach(() => {
  tokenActual = "token-de-prueba";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMisTurnos (HU-04)", () => {
  it("pide los turnos al endpoint con el token de la sesión", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { turnos: [unTurno] }));

    const turnos = await getMisTurnos();

    expect(turnos).toEqual([unTurno]);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/turnos\/mis-turnos$/);
    expect(opciones.headers.Authorization).toBe("Bearer token-de-prueba");
  });

  it("devuelve una lista vacía si el paciente no tiene turnos", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { turnos: [] }));

    await expect(getMisTurnos()).resolves.toEqual([]);
  });

  it("sin sesión no llama al backend y lanza 401", async () => {
    tokenActual = null;

    await expect(getMisTurnos()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si el backend responde 401 lo informa para volver al login", async () => {
    fetchMock.mockResolvedValue(respuesta(401, { message: "La sesión expiró o no es válida." }));

    await expect(getMisTurnos()).rejects.toMatchObject({ status: 401 });
  });

  it("CP-35: error del servidor -> 'No fue posible obtener los turnos.'", async () => {
    fetchMock.mockResolvedValue(
      respuesta(500, { message: "Ocurrió un error interno. Intente nuevamente más tarde." })
    );

    const error = await getMisTurnos().catch((e) => e);
    expect(error).toBeInstanceOf(TurnoRequestError);
    expect(error.message).toBe("No fue posible obtener los turnos.");
  });

  it("CP-35: backend apagado (error de red) -> 'No fue posible obtener los turnos.'", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getMisTurnos()).rejects.toThrow("No fue posible obtener los turnos.");
  });

  it("respuesta con formato inesperado -> 'No fue posible obtener los turnos.'", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { otraCosa: true }));

    await expect(getMisTurnos()).rejects.toThrow("No fue posible obtener los turnos.");
  });
});
