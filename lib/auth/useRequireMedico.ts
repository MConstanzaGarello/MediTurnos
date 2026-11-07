"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearMedicoSession, type SessionMedico } from "@/lib/auth/medicoSession";
import { useSessionMedico } from "@/lib/auth/useSessionMedico";

// El médico entra por el mismo login que el paciente (la pantalla inicial).
export const LOGIN_PATH = "/";

/**
 * Guarda de las pantallas del Portal del Médico.
 * - Si no hay sesión de médico, redirige al login (/).
 * - `cerrarSesion` borra la sesión del médico (no toca la del paciente) y
 *   vuelve al login (/). También se usa cuando la API responde 401 (token
 *   vencido o inválido).
 *
 * `medico` es `undefined` mientras se hidrata y `null` si no hay sesión:
 * en ambos casos la página debe mostrar "Verificando sesión...".
 */
export function useRequireMedico(): {
  medico: SessionMedico | null | undefined;
  cerrarSesion: () => void;
} {
  const router = useRouter();
  const medico = useSessionMedico();

  const cerrarSesion = useCallback(() => {
    clearMedicoSession();
    router.replace(LOGIN_PATH);
  }, [router]);

  useEffect(() => {
    if (medico === null) {
      router.replace(LOGIN_PATH);
    }
  }, [medico, router]);

  return { medico, cerrarSesion };
}
