/**
 * Tipos compartidos para el registro de pacientes (HU-01).
 * Se usan tanto en los componentes de formulario como en el servicio
 * que habla con el backend.
 */

export interface PatientRegisterFormData {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  password: string;
  confirmarPassword: string;
}

export type PatientRegisterField = keyof PatientRegisterFormData;

export type PatientRegisterErrors = Partial<
  Record<PatientRegisterField, string>
>;

/** Paciente tal como lo devuelve el backend (sin password). */
export interface PatientResponse {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  createdAt: string;
}

/** Forma estándar de error que devuelve la API. */
export interface ApiErrorResponse {
  message: string;
  errors?: PatientRegisterErrors;
}

export const emptyPatientForm: PatientRegisterFormData = {
  nombre: "",
  apellido: "",
  dni: "",
  fechaNacimiento: "",
  email: "",
  telefono: "",
  password: "",
  confirmarPassword: "",
};
