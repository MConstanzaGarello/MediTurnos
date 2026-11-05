"use client";

// HU-07 — Consultar historial de turnos.
//
// YO COMO paciente, DESEO consultar mi historial de turnos, PARA conocer
// los turnos que ya pasaron.
//
// Criterios de aceptación:
// - Se accede a "Historial" desde el menú principal (PatientShell).
// - Solo se muestran los turnos del paciente que inició sesión (el
//   backend saca el paciente del JWT).
// - Se muestran los turnos confirmados con fecha anterior al día actual.
// - Cada turno muestra especialidad, profesional, fecha, horario y estado.
// - Orden: del más reciente al más antiguo.
// - Sin turnos: "No posee turnos en el historial."
// - Error al consultar: "No fue posible obtener el historial de turnos."
//
// Reutiliza el endpoint de "Mis turnos" (HU-04): no hace falta uno nuevo.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientShell } from "@/components/layout/PatientShell";
import { TurnoCard } from "@/components/turnos/TurnoCard";
import { clearSession } from "@/lib/auth/session";
import { useSessionPatient } from "@/lib/auth/useSessionPatient";
import { getMisTurnos, TurnoRequestError } from "@/lib/services/turnoService";
import {
  filtrarHistorial,
  MENSAJE_ERROR_HISTORIAL,
  MENSAJE_SIN_HISTORIAL,
} from "@/lib/turnos/historial";
import type { MiTurno } from "@/lib/types/turno";

export default function HistorialPage() {
  const router = useRouter();
  const sessionPatient = useSessionPatient();

  const [turnos, setTurnos] = useState<MiTurno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  // Cada vez que cambia, se vuelven a pedir los turnos al backend.
  const [recarga, setRecarga] = useState(0);

  const cerrarSesionYSalir = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [router]);

  function reintentar() {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }

  // Solo un paciente logueado puede ver su historial: sin sesión -> login.
  useEffect(() => {
    if (sessionPatient === undefined) return; // todavía hidratando
    if (sessionPatient === null) {
      router.replace("/");
      return;
    }

    let vigente = true;
    getMisTurnos()
      .then((data) => {
        if (!vigente) return;
        setTurnos(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof TurnoRequestError && err.status === 401) {
          cerrarSesionYSalir();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_HISTORIAL);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [sessionPatient, router, cerrarSesionYSalir, recarga]);

  const historial = useMemo(() => filtrarHistorial(turnos), [turnos]);

  if (!sessionPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <PatientShell paciente={sessionPatient} onCerrarSesion={cerrarSesionYSalir}>
      <main className="flex-1 px-8 py-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de Turnos</h1>
          <p className="text-slate-400 text-sm mt-1">
            Consultá tus turnos anteriores
          </p>
        </div>

        <section className="mt-6 space-y-3 max-w-4xl" aria-live="polite">
          {cargando ? (
            <p className="text-slate-500 text-sm">Cargando turnos...</p>
          ) : errorMsg ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <p className="text-red-400 text-sm">{errorMsg}</p>
              <button
                type="button"
                onClick={reintentar}
                className="mt-3 text-sm text-slate-200 border border-slate-700 hover:border-cyan-500/60 rounded-lg px-4 py-2 transition"
              >
                Reintentar
              </button>
            </div>
          ) : historial.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300">{MENSAJE_SIN_HISTORIAL}</p>
            </div>
          ) : (
            historial.map((turno) => <TurnoCard key={turno.id} turno={turno} />)
          )}
        </section>
      </main>
    </PatientShell>
  );
}