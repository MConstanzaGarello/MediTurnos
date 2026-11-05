"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  SESSION_CHANGE_EVENT,
  type RolSesion,
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

/**
 * Lee la sesión guardada y devuelve el usuario solo si tiene el rol pedido
 * (así un administrador no entra a las pantallas del paciente ni al revés).
 * - `undefined`: todavía no se leyó el almacenamiento (primer render)
 * - `null`: no hay sesión de ese rol
 */
function useSessionPorRol(rol: RolSesion): SessionPatient | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => undefined
  );

  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;

    try {
      const sesion = JSON.parse(raw) as { paciente?: SessionPatient; rol?: RolSesion };
      if ((sesion.rol ?? "paciente") !== rol) return null;
      return sesion.paciente ?? null;
    } catch {
      return null;
    }
  }, [raw, rol]);
}

export function useSessionPatient(): SessionPatient | null | undefined {
  return useSessionPorRol("paciente");
}

/** HU-11: sesión del administrador (null si no inició sesión como tal). */
export function useSessionAdmin(): SessionPatient | null | undefined {
  return useSessionPorRol("admin");
}
