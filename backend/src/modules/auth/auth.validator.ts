import type { LoginErrors, LoginInput } from "./auth.types";

interface ValidationResult {
  errors: LoginErrors;
  data: LoginInput;
}

/**
 * Validación mínima del payload en el backend (defensa en profundidad).
 * El formato de correo y los mensajes de "campo obligatorio" ya los
 * cubre el frontend según los criterios de aceptación de HU-02; acá
 * solo evitamos procesar un payload incompleto o mal tipado.
 */
export function validateLoginInput(body: unknown): ValidationResult {
  const errors: LoginErrors = {};
  const raw = (body ?? {}) as Partial<LoginInput>;

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email) {
    errors.email = "El correo electrónico es obligatorio.";
  }

  if (!password) {
    errors.password = "La contraseña es obligatoria.";
  }

  return {
    errors,
    data: { email, password },
  };
}