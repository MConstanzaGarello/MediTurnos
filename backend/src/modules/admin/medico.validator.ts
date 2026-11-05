import { DOMINIO_EMAIL_MEDICO } from "./admin.constants";
import type { AltaMedicoErrors, AltaMedicoInput } from "./admin.types";

/**
 * Validación del alta de médico (HU-11) en el backend. Como en el resto del
 * sistema, el servidor no confía en lo que valida el frontend.
 */
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const MATRICULA_REGEX = /^\d{3,10}$/;
const EMAIL_LOCAL_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const PRECIO_MAXIMO = 9_999_999.99;

const MENSAJE_OBLIGATORIO = "Este campo es obligatorio.";

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function validarNombre(valor: string, errors: AltaMedicoErrors, campo: "nombre" | "apellido") {
  if (!valor) errors[campo] = MENSAJE_OBLIGATORIO;
  else if (valor.length > 50 || !NAME_REGEX.test(valor)) {
    errors[campo] = "Solo puede contener letras (hasta 50 caracteres).";
  }
}

export function validateAltaMedico(body: unknown): {
  errors: AltaMedicoErrors;
  data: AltaMedicoInput;
} {
  const raw = (body ?? {}) as Record<string, unknown>;
  const errors: AltaMedicoErrors = {};

  const nombre = texto(raw.nombre);
  const apellido = texto(raw.apellido);
  const matricula = texto(raw.matricula);
  const email = texto(raw.email).toLowerCase();
  const passwordTemporal = typeof raw.passwordTemporal === "string" ? raw.passwordTemporal : "";
  const info = texto(raw.info);

  validarNombre(nombre, errors, "nombre");
  validarNombre(apellido, errors, "apellido");

  if (!matricula) errors.matricula = MENSAJE_OBLIGATORIO;
  else if (!MATRICULA_REGEX.test(matricula)) {
    errors.matricula = "La matrícula debe tener entre 3 y 10 números.";
  }

  if (!email) errors.email = MENSAJE_OBLIGATORIO;
  else {
    const [local, ...resto] = email.split("@");
    const dominio = resto.length === 1 ? `@${resto[0]}` : "";
    if (dominio !== DOMINIO_EMAIL_MEDICO || !EMAIL_LOCAL_REGEX.test(local) || email.length > 255) {
      errors.email = `El correo debe ser del tipo nombre${DOMINIO_EMAIL_MEDICO} (ej: romanperez${DOMINIO_EMAIL_MEDICO}).`;
    }
  }

  const especialidadId = Number(raw.especialidadId);
  if (raw.especialidadId === undefined || raw.especialidadId === null || raw.especialidadId === "") {
    errors.especialidadId = MENSAJE_OBLIGATORIO;
  } else if (!Number.isInteger(especialidadId) || especialidadId <= 0) {
    errors.especialidadId = "Seleccioná una especialidad válida.";
  }

  let obrasSocialesIds: number[] = [];
  if (!Array.isArray(raw.obrasSocialesIds)) {
    errors.obrasSocialesIds = "Indicá las obras sociales que atiende (puede ser ninguna).";
  } else {
    const ids = raw.obrasSocialesIds.map(Number);
    if (ids.length > 30 || ids.some((n) => !Number.isInteger(n) || n <= 0)) {
      errors.obrasSocialesIds = "Las obras sociales seleccionadas no son válidas.";
    } else {
      obrasSocialesIds = [...new Set(ids)];
    }
  }

  const precio =
    typeof raw.precioParticular === "string" && raw.precioParticular.trim() !== ""
      ? Number(raw.precioParticular.replace(",", "."))
      : raw.precioParticular;
  if (precio === undefined || precio === null || precio === "") {
    errors.precioParticular = MENSAJE_OBLIGATORIO;
  } else if (typeof precio !== "number" || !Number.isFinite(precio) || precio <= 0) {
    errors.precioParticular = "El precio debe ser un número mayor a 0.";
  } else if (precio > PRECIO_MAXIMO || Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6) {
    errors.precioParticular = "El precio no es válido (máximo 2 decimales).";
  }

  if (!passwordTemporal) errors.passwordTemporal = MENSAJE_OBLIGATORIO;
  else if (
    passwordTemporal.length < 8 ||
    passwordTemporal.length > 72 ||
    !/[A-Za-z]/.test(passwordTemporal) ||
    !/\d/.test(passwordTemporal)
  ) {
    errors.passwordTemporal = "La contraseña temporal debe tener al menos 8 caracteres, con letras y números.";
  }

  if (info.length > 255) errors.info = "Los horarios no pueden superar los 255 caracteres.";

  return {
    errors,
    data: {
      nombre,
      apellido,
      matricula,
      email,
      especialidadId,
      obrasSocialesIds,
      precioParticular: typeof precio === "number" ? precio : 0,
      passwordTemporal,
      ...(info ? { info } : {}),
    },
  };
}

/** Valida el body de PATCH /medicos/:id/especialidad. */
export function validateEspecialidadId(body: unknown): number | null {
  const valor = Number((body as { especialidadId?: unknown } | null)?.especialidadId);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}
