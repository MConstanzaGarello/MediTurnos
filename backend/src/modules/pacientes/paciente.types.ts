export interface PatientRegisterInput {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  password: string;
  confirmarPassword: string;
}

export type PatientRegisterField = keyof PatientRegisterInput;

export type PatientRegisterErrors = Partial<
  Record<PatientRegisterField, string>
>;

/** Forma pública de un paciente: nunca incluye la contraseña. */
export interface PublicPatient {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  createdAt: string;
}
