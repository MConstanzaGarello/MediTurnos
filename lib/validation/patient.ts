import type {
  PatientRegisterErrors,
  PatientRegisterFormData,
} from "@/lib/types/patient";

/**
 * Validaciones del formulario de registro de paciente (HU-01).
 *
 * IMPORTANTE: estas validaciones son para experiencia de usuario.
 * El backend vuelve a validar todo — nunca hay que confiar
 * únicamente en lo que se valida acá.
 */

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const DNI_REGEX = /^\d{7,8}$/;
const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
// Dígitos, espacios, guiones, paréntesis y un "+" opcional al inicio.
const PHONE_REGEX = /^\+?[0-9()\s-]{6,20}$/;
const PHONE_DIGITS_MIN = 8;
const PHONE_DIGITS_MAX = 15;

export const REQUIRED_MESSAGE = "Este campo es obligatorio.";

export interface PasswordRequirementState {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
}

export const PASSWORD_REQUIREMENTS: {
  key: keyof PasswordRequirementState;
  label: string;
  test: (password: string) => boolean;
}[] = [
  {
    key: "minLength",
    label: "Al menos 8 caracteres",
    test: (password) => password.length >= 8,
  },
  {
    key: "hasUpperCase",
    label: "Una mayúscula",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: "hasLowerCase",
    label: "Una minúscula",
    test: (password) => /[a-z]/.test(password),
  },
  {
    key: "hasNumber",
    label: "Un número",
    test: (password) => /[0-9]/.test(password),
  },
];

export function getPasswordRequirementState(
  password: string
): PasswordRequirementState {
  return {
    minLength: PASSWORD_REQUIREMENTS[0].test(password),
    hasUpperCase: PASSWORD_REQUIREMENTS[1].test(password),
    hasLowerCase: PASSWORD_REQUIREMENTS[2].test(password),
    hasNumber: PASSWORD_REQUIREMENTS[3].test(password),
  };
}

export function isNameValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && NAME_REGEX.test(trimmed);
}

export function isDniValid(value: string): boolean {
  return DNI_REGEX.test(value.trim());
}

export function isBirthDateValid(value: string): boolean {
  if (!value) return false;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() <= today.getTime();
}

export function isEmailValid(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isPhoneValid(value: string): boolean {
  const trimmed = value.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;

  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= PHONE_DIGITS_MIN && digitCount <= PHONE_DIGITS_MAX;
}

export function getPasswordError(value: string): string | null {
  const state = getPasswordRequirementState(value);

  if (!state.minLength) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!state.hasUpperCase) {
    return "Debe incluir una letra mayúscula.";
  }
  if (!state.hasLowerCase) {
    return "Debe incluir una letra minúscula.";
  }
  if (!state.hasNumber) {
    return "Debe incluir un número.";
  }
  return null;
}

/**
 * Valida un único campo del formulario. Se usa tanto al tipear (onBlur /
 * onChange) como al validar todo el formulario antes de enviarlo.
 * `allValues` es necesario para comparar confirmarPassword con password.
 */
export function validateField(
  field: keyof PatientRegisterFormData,
  value: string,
  allValues: PatientRegisterFormData
): string | null {
  if (!value || !value.trim()) {
    return REQUIRED_MESSAGE;
  }

  switch (field) {
    case "nombre":
      return isNameValid(value) ? null : "Ingrese un nombre válido.";
    case "apellido":
      return isNameValid(value) ? null : "Ingrese un apellido válido.";
    case "dni":
      return isDniValid(value) ? null : "Ingrese un DNI válido.";
    case "fechaNacimiento":
      return isBirthDateValid(value)
        ? null
        : "Ingrese una fecha de nacimiento válida.";
    case "email":
      return isEmailValid(value) ? null : "Ingrese un correo electrónico válido.";
    case "telefono":
      return isPhoneValid(value) ? null : "Ingrese un teléfono válido.";
    case "password":
      return getPasswordError(value);
    case "confirmarPassword":
      return value === allValues.password
        ? null
        : "Las contraseñas no coinciden.";
    default:
      return null;
  }
}

/** Valida el formulario completo. Devuelve un objeto de errores vacío si es válido. */
export function validatePatientForm(
  values: PatientRegisterFormData
): PatientRegisterErrors {
  const errors: PatientRegisterErrors = {};

  (Object.keys(values) as (keyof PatientRegisterFormData)[]).forEach(
    (field) => {
      const error = validateField(field, values[field], values);
      if (error) {
        errors[field] = error;
      }
    }
  );

  return errors;
}
