import type { EstadoTurno } from "./turno.constants";

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

/**
 * Turno tal como lo ve el paciente en "Mis turnos" (HU-04): con los datos
 * de especialidad y profesional ya resueltos para no hacer más pedidos.
 */
export interface MiTurno {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  especialidad: {
    id: number;
    nombre: string;
  };
  profesional: {
    id: number;
    nombre: string;
    info: string;
  };
}
