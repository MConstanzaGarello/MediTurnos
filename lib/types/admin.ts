/** Tipos de las pantallas del administrador (HU-11 y HU-12). */

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

export interface ObraSocial {
  id: number;
  nombre: string;
}

export interface MedicoAdmin {
  id: number;
  nombre: string;
  matricula: string | null;
  email: string | null;
  info: string;
  precioParticular: number | null;
  especialidadId: number;
  especialidad: string;
  obrasSociales: ObraSocial[];
}

/** Datos del formulario de alta (todo texto, como lo tipea el administrador). */
export interface AltaMedicoForm {
  nombre: string;
  apellido: string;
  matricula: string;
  email: string;
  especialidadId: string;
  precioParticular: string;
  passwordTemporal: string;
  info: string;
  obrasSocialesIds: number[];
}

export type AltaMedicoField = keyof AltaMedicoForm;
export type AltaMedicoErrors = Partial<Record<AltaMedicoField, string>>;

export interface ReporteMensual {
  mes: string;
  totales: {
    total: number;
    realizados: number;
    proximos: number;
    cancelados: number;
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
