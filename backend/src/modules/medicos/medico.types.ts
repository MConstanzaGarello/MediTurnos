import type { EstadoTurno } from "../turnos/turno.constants";

/** Paciente tal como lo ve el médico dentro de un turno. */
export interface PacienteDeTurno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
}

/** Turno de la agenda del día del médico. */
export interface TurnoDelDia {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  paciente: PacienteDeTurno | null;
}

export interface MetricasDelDia {
  /** Todos los turnos de la fecha consultada (cualquier estado). */
  turnosHoy: number;
  confirmados: number;
  pendientes: number;
  cancelados: number;
  atendidos: number;
}

export interface DashboardMedico {
  fecha: string; // YYYY-MM-DD del día consultado (por defecto, hoy)
  hoy: string; // YYYY-MM-DD de hoy (hora de Argentina), para que la pantalla sepa si es pasado/futuro
  metricas: MetricasDelDia;
  turnos: TurnoDelDia[];
}

/** Paciente único que el médico ya atendió. */
export interface PacienteAtendido {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
  ultimaVisita: string; // YYYY-MM-DD
  totalVisitas: number;
}

export interface PerfilMedico {
  id: number;
  nombre: string;
  email: string;
  matricula: string | null;
  telefono: string | null;
  diasAtencion: string | null;
  info: string;
  especialidad: {
    id: number;
    nombre: string;
  };
}

/** Datos que el médico puede editar de su perfil. */
export interface ActualizarPerfilInput {
  diasAtencion: string;
  info: string;
}
