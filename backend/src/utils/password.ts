import bcrypt from "bcrypt";
import { env } from "../config/env";

/** Hashea una contraseña en texto plano. Nunca se guarda el valor original. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, env.bcryptSaltRounds);
}

/** Compara una contraseña en texto plano contra su hash almacenado. */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
