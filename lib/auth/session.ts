
export interface SessionPatient {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface StoredSession {
  token: string;
  paciente: SessionPatient;
}

export const STORAGE_KEY = "mediturnos_session";
export const SESSION_CHANGE_EVENT = "mediturnos-session-change";

export function saveSession(
  token: string,
  paciente: SessionPatient
): void {
  if (typeof window === "undefined") return;

  const data: StoredSession = { token, paciente };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function updateSessionPatient(paciente: SessionPatient): void {
  const session = getSession();

  if (!session) return;

  saveSession(session.token, paciente);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}
