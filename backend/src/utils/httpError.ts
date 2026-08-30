export type HttpErrorFields = Partial<Record<string, string>>;

/**
 * Error HTTP tipado para que el middleware de errores devuelva el status
 * code y el cuerpo correctos sin acoplar los controladores a Express.
 */
export class HttpError extends Error {
  status: number;
  errors?: HttpErrorFields;

  constructor(status: number, message: string, errors?: HttpErrorFields) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: HttpErrorFields) {
    return new HttpError(400, message, errors);
  }

  static conflict(message: string, errors?: HttpErrorFields) {
    return new HttpError(409, message, errors);
  }

  static unauthorized(message: string, errors?: HttpErrorFields) {
    return new HttpError(401, message, errors);
  }

  static notFound(message: string, errors?: HttpErrorFields) {
    return new HttpError(404, message, errors);
  }
}