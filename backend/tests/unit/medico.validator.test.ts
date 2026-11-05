/** HU-11 — Pruebas unitarias de la validación del alta de médico. */
import { validateAltaMedico } from "../../src/modules/admin/medico.validator";

const valido = {
  nombre: "Román",
  apellido: "Pérez",
  matricula: "12345",
  email: "romanperez@mediturnos.com",
  especialidadId: 1,
  obrasSocialesIds: [1, 2],
  precioParticular: 25000,
  passwordTemporal: "Temporal123",
};

describe("validateAltaMedico (HU-11)", () => {
  it("datos correctos: sin errores y email en minúsculas", () => {
    const { errors, data } = validateAltaMedico({ ...valido, email: "RomanPerez@MediTurnos.com" });
    expect(errors).toEqual({});
    expect(data.email).toBe("romanperez@mediturnos.com");
    expect(data.obrasSocialesIds).toEqual([1, 2]);
  });

  it("campos obligatorios vacíos", () => {
    const { errors } = validateAltaMedico({});
    expect(errors.nombre).toBe("Este campo es obligatorio.");
    expect(errors.apellido).toBeDefined();
    expect(errors.matricula).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.especialidadId).toBeDefined();
    expect(errors.precioParticular).toBeDefined();
    expect(errors.passwordTemporal).toBeDefined();
  });

  it.each(["roman@gmail.com", "roman@mediturnos.com.ar", "@mediturnos.com", "ro man@mediturnos.com", "a@b@mediturnos.com"])(
    "rechaza el correo %s",
    (email) => {
      expect(validateAltaMedico({ ...valido, email }).errors.email).toBeDefined();
    }
  );

  it.each([0, -5, "abc", 12.345, 10_000_000])("rechaza el precio %p", (precioParticular) => {
    expect(validateAltaMedico({ ...valido, precioParticular }).errors.precioParticular).toBeDefined();
  });

  it("acepta el precio como texto con coma decimal", () => {
    const { errors, data } = validateAltaMedico({ ...valido, precioParticular: "25000,50" });
    expect(errors).toEqual({});
    expect(data.precioParticular).toBe(25000.5);
  });

  it("matrícula con letras o muy corta", () => {
    expect(validateAltaMedico({ ...valido, matricula: "12" }).errors.matricula).toBeDefined();
    expect(validateAltaMedico({ ...valido, matricula: "MP123" }).errors.matricula).toBeDefined();
  });

  it("obras sociales: debe ser lista (puede estar vacía) y sin repetidos", () => {
    expect(validateAltaMedico({ ...valido, obrasSocialesIds: [] }).errors).toEqual({});
    expect(validateAltaMedico({ ...valido, obrasSocialesIds: "1" }).errors.obrasSocialesIds).toBeDefined();
    expect(validateAltaMedico({ ...valido, obrasSocialesIds: [1, 1, 2] }).data.obrasSocialesIds).toEqual([1, 2]);
  });

  it("contraseña temporal débil", () => {
    expect(validateAltaMedico({ ...valido, passwordTemporal: "corta1" }).errors.passwordTemporal).toBeDefined();
    expect(validateAltaMedico({ ...valido, passwordTemporal: "sololetrasaqui" }).errors.passwordTemporal).toBeDefined();
  });
});
