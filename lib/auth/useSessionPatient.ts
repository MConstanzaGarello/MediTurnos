"use client";

import { useMemo, useSyncExternalStore } from "react";
import { STORAGE_KEY, type SessionPatient } from "@/lib/auth/session";

/**
 * Lee el paciente logueado de localStorage (ver lib/auth/session.ts) sin
 * romper la hidratación de Next.js:
 * - `undefined` mientras se hidrata (todavía no se puede leer el navegador).
 * - `null` si no hay sesión.
 * - el paciente si hay sesión.
 * Se actualiza solo si la sesión cambia en otra pestaña.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function useSessionPatient(): SessionPatient | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => undefined
  );

  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return (JSON.parse(raw) as { paciente: SessionPatient }).paciente ?? null;
    } catch {
      return null;
    }
  }, [raw]);
}
