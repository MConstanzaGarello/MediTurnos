import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionTokenPayload {
  pacienteId: number;
  email: string;
}

/**
 * Payload del JWT del médico. Es distinto al del paciente (tiene
 * `profesionalId` y `role`) para que un token de un tipo de usuario no
 * sirva en las rutas del otro.
 */
export interface DoctorTokenPayload {
  profesionalId: number;
  email: string;
  role: "medico";
}

/**
 * Genera el JWT que se entrega al loguearse. Es lo único que identifica
 * al paciente en los pedidos siguientes (por ejemplo, al solicitar un
 * turno en HU-03).
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    // El tipo de jsonwebtoken exige un formato tipo "8h" / "30m"; viene de .env.
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  });
}

/**
 * Verifica y decodifica el JWT recibido en el header Authorization.
 * Lanza si el token es inválido o expiró (lo captura el middleware).
 */
export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.jwt.secret) as SessionTokenPayload;
}

/** JWT del médico (Portal del Médico). */
export function signDoctorToken(
  payload: Omit<DoctorTokenPayload, "role">
): string {
  return jwt.sign({ ...payload, role: "medico" }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  });
}

/**
 * Verifica el JWT de un médico. Lanza si el token es inválido, expiró o no
 * es un token de médico (por ejemplo, uno de paciente).
 */
export function verifyDoctorToken(token: string): DoctorTokenPayload {
  const payload = jwt.verify(token, env.jwt.secret) as Partial<DoctorTokenPayload>;
  if (payload.role !== "medico" || typeof payload.profesionalId !== "number") {
    throw new Error("Token de médico inválido.");
  }
  return payload as DoctorTokenPayload;
}
