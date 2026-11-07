import type { EstadoTurno } from "@/lib/types/turno";

/** Médico autenticado, tal como lo devuelve POST /api/auth/medico/login. */
export interface AuthenticatedMedico {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

export interface PacienteDeTurno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  telefono: string;
}

export interface TurnoDelDia {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: EstadoTurno;
  paciente: PacienteDeTurno | null;
}

export interface MetricasDelDia {
  turnosHoy: number;
  confirmados: number;
  pendientes: number;
  cancelados: number;
  atendidos: number;
}

export interface DashboardMedico {
  fecha: string; // YYYY-MM-DD del día consultado
  hoy: string; // YYYY-MM-DD de hoy (hora de Argentina)
  metricas: MetricasDelDia;
  turnos: TurnoDelDia[];
}

export interface PacienteAtendido extends PacienteDeTurno {
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

/** Estados que el médico puede asignar a un turno. */
export type EstadoAsignable = "atendido" | "pendiente";

/** Lo que el médico puede editar de su perfil. */
export interface ActualizarPerfilInput {
  diasAtencion: string;
  info: string;
}
