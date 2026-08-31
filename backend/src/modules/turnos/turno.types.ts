export interface TurnoCreateInput {
  especialidadId: number;
  profesionalId: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

export type TurnoCreateField = "especialidad" | "profesional" | "fecha" | "hora";

export type TurnoCreateErrors = Partial<Record<TurnoCreateField, string>>;

export interface PublicTurno {
  id: number;
  especialidadId: number;
  profesionalId: number;
  pacienteId: number;
  fecha: string;
  hora: string;
  createdAt: string;
}

export interface HorarioDisponibilidad {
  hora: string;
  ocupado: boolean;
}
