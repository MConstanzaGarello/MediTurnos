/**
 * Tipos compartidos para solicitar un turno (HU-03).
 */

export interface Especialidad {
  id: number;
  nombre: string;
}

export interface Profesional {
  id: number;
  nombre: string;
  info: string;
  especialidadId: number;
}

export interface HorarioDisponibilidad {
  hora: string;
  ocupado: boolean;
}

export interface TurnoCreatePayload {
  especialidadId: number;
  profesionalId: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

export interface TurnoResponse {
  id: number;
  especialidadId: number;
  profesionalId: number;
  pacienteId: number | null;
  fecha: string;
  hora: string;
  createdAt: string;
}

export type TurnoCreateField = "especialidad" | "profesional" | "fecha" | "hora";

export type TurnoCreateErrors = Partial<Record<TurnoCreateField, string>>;

export interface ApiErrorResponse {
  message: string;
  errors?: TurnoCreateErrors;
}
