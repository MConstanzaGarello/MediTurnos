import type {
  PatientRegisterErrors,
  PatientRegisterField,
  PatientRegisterInput,
} from "./paciente.types";

/**
 * Validación de datos en el backend para HU-01 (registro de paciente).
 *
 * Estas reglas son OBLIGATORIAS por seguridad: replican (y no dependen
 * de) las validaciones del frontend, porque el backend nunca debe
 * confiar en lo que llega del cliente.
 */

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const DNI_REGEX = /^\d{7,8}$/;
const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const PHONE_REGEX = /^\+?[0-9()\s-]{6,20}$/;
const PHONE_DIGITS_MIN = 8;
const PHONE_DIGITS_MAX = 15;

const REQUIRED_FIELDS: PatientRegisterField[] = [
  "nombre",
  "apellido",
  "dni",
  "fechaNacimiento",
  "email",
  "telefono",
  "password",
  "confirmarPassword",
];

function isNameValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && NAME_REGEX.test(trimmed);
}

function isBirthDateValid(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return date.getTime() <= today.getTime();
}

function isPhoneValid(value: string): boolean {
  const trimmed = value.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= PHONE_DIGITS_MIN && digitCount <= PHONE_DIGITS_MAX;
}

function getPasswordError(value: string): string | null {
  if (value.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Debe incluir una letra mayúscula.";
  }
  if (!/[a-z]/.test(value)) {
    return "Debe incluir una letra minúscula.";
  }
  if (!/[0-9]/.test(value)) {
    return "Debe incluir un número.";
  }
  return null;
}

/**
 * Valida y normaliza (trim) el payload de registro. Si `errors` queda
 * vacío, `data` contiene los valores ya validados y listos para usar.
 */
export function validatePatientRegisterInput(payload: unknown): {
  errors: PatientRegisterErrors;
  data: PatientRegisterInput;
} {
  const errors: PatientRegisterErrors = {};
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;

  const data: PatientRegisterInput = {
    nombre: typeof body.nombre === "string" ? body.nombre.trim() : "",
    apellido: typeof body.apellido === "string" ? body.apellido.trim() : "",
    dni: typeof body.dni === "string" ? body.dni.trim() : "",
    fechaNacimiento:
      typeof body.fechaNacimiento === "string" ? body.fechaNacimiento.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    telefono: typeof body.telefono === "string" ? body.telefono.trim() : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmarPassword:
      typeof body.confirmarPassword === "string" ? body.confirmarPassword : "",
  };

  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || data[field].trim() === "") {
      errors[field] = "Este campo es obligatorio.";
    }
  }

  if (!errors.nombre && !isNameValid(data.nombre)) {
    errors.nombre = "Ingrese un nombre válido.";
  }

  if (!errors.apellido && !isNameValid(data.apellido)) {
    errors.apellido = "Ingrese un apellido válido.";
  }

  if (!errors.dni && !DNI_REGEX.test(data.dni)) {
    errors.dni = "Ingrese un DNI válido.";
  }

  if (!errors.fechaNacimiento && !isBirthDateValid(data.fechaNacimiento)) {
    errors.fechaNacimiento = "Ingrese una fecha de nacimiento válida.";
  }

  if (!errors.email && !EMAIL_REGEX.test(data.email)) {
    errors.email = "Ingrese un correo electrónico válido.";
  }

  if (!errors.telefono && !isPhoneValid(data.telefono)) {
    errors.telefono = "Ingrese un teléfono válido.";
  }

  if (!errors.password) {
    const passwordError = getPasswordError(data.password);
    if (passwordError) {
      errors.password = passwordError;
    }
  }

  if (!errors.confirmarPassword && data.password !== data.confirmarPassword) {
    errors.confirmarPassword = "Las contraseñas no coinciden.";
  }

  return { errors, data };
}
