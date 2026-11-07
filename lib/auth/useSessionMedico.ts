"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  MEDICO_STORAGE_KEY,
  type SessionMedico,
} from "@/lib/auth/medicoSession";

/**
 * Lee el médico logueado de localStorage (ver lib/auth/medicoSession.ts) sin
 * romper la hidratación de Next.js. Mismo contrato que useSessionPatient:
 * - `undefined` mientras se hidrata.
 * - `null` si no hay sesión.
 * - el médico si hay sesión.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function useSessionMedico(): SessionMedico | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(MEDICO_STORAGE_KEY),
    () => undefined
  );

  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return (JSON.parse(raw) as { medico: SessionMedico }).medico ?? null;
    } catch {
      return null;
    }
  }, [raw]);
}
