import { describe, expect, it } from "vitest";
import { formatearPrecio, formVacio, validarAltaMedico } from "./altaMedico";
import type { AltaMedicoForm } from "@/lib/types/admin";

const valido: AltaMedicoForm = {
  nombre: "Román",
  apellido: "Pérez",
  matricula: "12345",
  email: "romanperez@mediturnos.com",
  especialidadId: "1",
  precioParticular: "25000",
  passwordTemporal: "Temporal123",
  info: "",
  obrasSocialesIds: [1],
};

describe("validarAltaMedico (HU-11)", () => {
  it("formulario correcto: sin errores", () => {
    expect(validarAltaMedico(valido)).toEqual({});
  });

  it("formulario vacío: marca los campos obligatorios", () => {
    const e = validarAltaMedico(formVacio);
    expect(Object.keys(e).sort()).toEqual(
      ["apellido", "email", "especialidadId", "matricula", "nombre", "passwordTemporal", "precioParticular"].sort()
    );
  });

  it("el correo debe terminar en @mediturnos.com", () => {
    expect(validarAltaMedico({ ...valido, email: "roman@gmail.com" }).email).toBeDefined();
    expect(validarAltaMedico({ ...valido, email: "Roman.Perez@MediTurnos.com" }).email).toBeUndefined();
  });

  it("precio: mayor a 0, hasta 2 decimales, acepta coma", () => {
    expect(validarAltaMedico({ ...valido, precioParticular: "0" }).precioParticular).toBeDefined();
    expect(validarAltaMedico({ ...valido, precioParticular: "-10" }).precioParticular).toBeDefined();
    expect(validarAltaMedico({ ...valido, precioParticular: "10,555" }).precioParticular).toBeDefined();
    expect(validarAltaMedico({ ...valido, precioParticular: "25000,50" }).precioParticular).toBeUndefined();
  });

  it("matrícula numérica de 3 a 10 dígitos", () => {
    expect(validarAltaMedico({ ...valido, matricula: "12" }).matricula).toBeDefined();
    expect(validarAltaMedico({ ...valido, matricula: "AB123" }).matricula).toBeDefined();
  });

  it("contraseña temporal: 8+ caracteres con letras y números", () => {
    expect(validarAltaMedico({ ...valido, passwordTemporal: "abc123" }).passwordTemporal).toBeDefined();
    expect(validarAltaMedico({ ...valido, passwordTemporal: "soloLetrasAqui" }).passwordTemporal).toBeDefined();
  });
});

describe("formatearPrecio", () => {
  it("formatea en pesos y tolera null", () => {
    expect(formatearPrecio(25000)).toMatch(/^\$\s25\.000$/);
    expect(formatearPrecio(null)).toBe("—");
  });
});
