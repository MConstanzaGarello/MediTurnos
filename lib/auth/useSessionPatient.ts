
"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  SESSION_CHANGE_EVENT,
  type SessionPatient,
} from "@/lib/auth/session";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SESSION_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
  };
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
