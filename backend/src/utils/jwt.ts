import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionTokenPayload {
  pacienteId: number;
  email: string;
}

/**
 * Genera el JWT que se entrega al loguearse. Es lo único que identifica
 * al paciente en los pedidos siguientes (por ejemplo, al solicitar un
 * turno en HU-03).
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

/**
 * Verifica y decodifica el JWT recibido en el header Authorization.
 * Lanza si el token es inválido o expiró (lo captura el middleware).
 */
export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.jwt.secret) as SessionTokenPayload;
}
