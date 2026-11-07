/**
 * Sesión del médico (Portal del Médico), persistida en localStorage.
 *
 * Usa una clave PROPIA ("mediturnos_medico_session"), distinta a la del
 * paciente ("mediturnos_session", ver lib/auth/session.ts), para que las dos
 * sesiones no se pisen ni se mezclen: el token de un médico nunca se envía
 * en las pantallas del paciente y viceversa.
 */

export interface SessionMedico {
  id: number;
  nombre: string;
  email: string;
  especialidad: string;
}

export const MEDICO_STORAGE_KEY = "mediturnos_medico_session";

interface StoredMedicoSession {
  token: string;
  medico: SessionMedico;
}

export function saveMedicoSession(token: string, medico: SessionMedico): void {
  if (typeof window === "undefined") return;
  const data: StoredMedicoSession = { token, medico };
  window.localStorage.setItem(MEDICO_STORAGE_KEY, JSON.stringify(data));
}

export function getMedicoSession(): StoredMedicoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MEDICO_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredMedicoSession;
  } catch {
    return null;
  }
}

export function getMedicoToken(): string | null {
  return getMedicoSession()?.token ?? null;
}

export function clearMedicoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MEDICO_STORAGE_KEY);
}
