export interface AltaMedicoInput {
  nombre: string;
  apellido: string;
  matricula: string;
  email: string;
  especialidadId: number;
  obrasSocialesIds: number[];
  precioParticular: number;
  passwordTemporal: string;
  /** Texto de días y horarios; opcional (se usa la agenda inicial). */
  info?: string;
}

export type AltaMedicoField = keyof AltaMedicoInput;
export type AltaMedicoErrors = Partial<Record<AltaMedicoField, string>>;

export interface PublicMedico {
  id: number;
  nombre: string;
  matricula: string | null;
  email: string | null;
  info: string;
  precioParticular: number | null;
  especialidadId: number;
  especialidad: string;
  obrasSociales: { id: number; nombre: string }[];
}

export type EstadoTurnoAdmin = "confirmado" | "cancelado";

export interface TurnoDashboard {
  id: number;
  hora: string;
  paciente: string;
  dni: string;
  profesional: string;
  especialidad: string;
  estado: EstadoTurnoAdmin;
}

export interface DashboardAdmin {
  fecha: string;
  resumen: { total: number; confirmados: number; cancelados: number };
  turnos: TurnoDashboard[];
}

/** Turno ya "aplanado" para armar el reporte (ver reportes.logic.ts). */
export interface TurnoParaReporte {
  fecha: string;
  hora: string;
  estado: EstadoTurnoAdmin;
  profesionalId: number;
  profesional: string;
  especialidad: string;
}

export interface ReporteMensual {
  mes: string;
  totales: {
    total: number;
    realizados: number;
    proximos: number;
    cancelados: number;
    /** Porcentaje entero de turnos cancelados sobre el total (0 si no hay turnos). */
    tasaCancelacion: number;
  };
  porEspecialidad: { especialidad: string; cantidad: number }[];
  franjas: { franja: string; cantidad: number }[];
  profesionales: {
    profesionalId: number;
    nombre: string;
    especialidad: string;
    confirmados: number;
    cancelados: number;
    total: number;
  }[];
}
