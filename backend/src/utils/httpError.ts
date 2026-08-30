import type { PatientRegisterErrors } from "../modules/pacientes/paciente.types";

/**
 * Error HTTP tipado para que el middleware de errores devuelva el status
 * code y el cuerpo correctos sin acoplar los controladores a Express.
 */
export class HttpError extends Error {
  status: number;
  errors?: PatientRegisterErrors;

  constructor(status: number, message: string, errors?: PatientRegisterErrors) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: PatientRegisterErrors) {
    return new HttpError(400, message, errors);
  }

  static conflict(message: string, errors?: PatientRegisterErrors) {
    return new HttpError(409, message, errors);
  }
}
