import type { PublicPatient } from "../pacientes/paciente.types";

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginField = keyof LoginInput;

export type LoginErrors = Partial<Record<LoginField, string>>;

/** Datos públicos del médico que devuelve el login (nunca la contraseña). */
export interface PublicDoctor {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

/** Resultado del login único: según el rol, trae al paciente o al médico. */
export type LoginResult =
  | { rol: "paciente"; paciente: PublicPatient; token: string }
  | { rol: "medico"; medico: PublicDoctor; token: string };
