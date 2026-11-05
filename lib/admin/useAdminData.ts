"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, type SessionPatient } from "@/lib/auth/session";
import { useSessionAdmin } from "@/lib/auth/useSessionPatient";
import { AdminRequestError } from "@/lib/services/adminService";

interface Resultado<T> {
  cargar: () => Promise<T>;
  recarga: number;
  data: T | null;
  error: string | null;
}

/**
 * Carga datos de una pantalla del administrador (HU-11 / HU-12):
 * - sin sesión de administrador -> vuelve al login
 * - 401/403 del servidor -> cierra la sesión y vuelve al login
 * - `cargar` tiene que estar memorizada (useCallback): cuando cambia (por
 *   ejemplo, al elegir otro mes) se vuelve a pedir y `cargando` pasa a true.
 */
export function useAdminData<T>(cargar: () => Promise<T>) {
  const router = useRouter();
  const admin = useSessionAdmin();
  const [recarga, setRecarga] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);

  const salir = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (admin === undefined) return;
    if (admin === null) {
      router.replace("/");
      return;
    }

    let vigente = true;

    cargar()
      .then((data) => {
        if (vigente) setResultado({ cargar, recarga, data, error: null });
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof AdminRequestError && (err.status === 401 || err.status === 403)) {
          salir();
          return;
        }
        setResultado({
          cargar,
          recarga,
          data: null,
          error: err instanceof Error ? err.message : "Ocurrió un error inesperado.",
        });
      });

    return () => {
      vigente = false;
    };
  }, [admin, cargar, recarga, router, salir]);

  const actual = resultado && resultado.cargar === cargar && resultado.recarga === recarga ? resultado : null;

  return {
    admin: admin as SessionPatient | null | undefined,
    data: actual?.data ?? null,
    error: actual?.error ?? null,
    cargando: admin !== null && admin !== undefined && actual === null,
    recargar: () => setRecarga((n) => n + 1),
    salir,
  };
}
