/**
 * Sesión del paciente logueado (HU-02), persistida en localStorage para
 * que sobreviva a la navegación entre páginas y a recargar el navegador.
 *
 * Es deliberadamente simple (localStorage + JWT), acorde al alcance de
 * este TP. Para un sistema en producción real conviene evaluar cookies
 * httpOnly en vez de localStorage (mitiga XSS), pero eso requiere que el
 * backend maneje cookies de sesión en vez de devolver el token en el
 * body de la respuesta.
 */

export interface SessionPatient {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export const STORAGE_KEY = "mediturnos_session";

interface StoredSession {
  token: string;
  paciente: SessionPatient;
}

export function saveSession(token: string, paciente: SessionPatient): void {
  if (typeof window === "undefined") return;
  const data: StoredSession = { token, paciente };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
