"use client";

// HU-04 — Consultar mis turnos.
//
// YO COMO paciente, DESEO consultar mis turnos programados, PARA conocer
// la fecha, horario y estado de cada uno.
//
// Criterios de aceptación (Sprint Backlog del Sprint 1):
// - Se accede a "Mis turnos" desde el menú principal (PatientShell).
// - Solo se muestran los turnos del paciente que inició sesión (el
//   backend saca el paciente del JWT).
// - Cada turno muestra especialidad, profesional, fecha, horario y estado.
// - Los turnos se muestran ordenados por fecha.
// - Sin turnos: "No posee turnos programados."
// - Error al consultar: "No fue posible obtener los turnos."

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientShell } from "@/components/layout/PatientShell";
import { TurnoCard } from "@/components/turnos/TurnoCard";
import ModalReprogramar from "@/components/turnos/ModalReprogramar";
import { clearSession } from "@/lib/auth/session";
import { useSessionPatient } from "@/lib/auth/useSessionPatient";
import { getMisTurnos, TurnoRequestError } from "@/lib/services/turnoService";
import {
  clasificarTurnos,
  MENSAJE_ERROR_TURNOS,
  mensajeSinTurnos,
  PESTANAS,
  type PestanaTurnos,
} from "@/lib/turnos/misTurnos";
import type { MiTurno } from "@/lib/types/turno";

export default function MisTurnosPage() {
  const router = useRouter();
  const sessionPatient = useSessionPatient();

  const [turnos, setTurnos] = useState<MiTurno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [pestana, setPestana] = useState<PestanaTurnos>("proximos");
  // Cada vez que cambia, se vuelven a pedir los turnos al backend.
  const [recarga, setRecarga] = useState(0);
  const [turnoAReprogramar, setTurnoAReprogramar] = useState<MiTurno | null>(null);

  const cerrarSesionYSalir = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [router]);

  /**
   * Vuelve a traer los turnos del backend sin mostrar "Cargando...".
   * HU-05 (cancelar) y HU-06 (reprogramar) la llaman después de modificar
   * un turno para refrescar la lista y los contadores de las pestañas.
   */
  const cargarTurnos = useCallback(() => setRecarga((n) => n + 1), []);

  function reintentar() {
    setCargando(true);
    setErrorMsg("");
    cargarTurnos();
  }

  // Solo un paciente logueado puede ver sus turnos: sin sesión -> login.
  // Con sesión, se piden los turnos al backend.
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
        setErrorMsg(MENSAJE_ERROR_TURNOS);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [sessionPatient, router, cerrarSesionYSalir, recarga]);

  const porPestana = useMemo(() => clasificarTurnos(turnos), [turnos]);
  const turnosVisibles = porPestana[pestana];

  /**
   * Botones de cada turno.
   * - HU-05 (Cancelar turno): agregar acá el botón "Cancelar" para los
   *   turnos confirmados y, al confirmar la cancelación, llamar a
   *   `cargarTurnos()`.
   * - HU-06 (Reprogramar turno): agregar acá el botón "Reprogramar" y,
   *   al terminar, llamar a `cargarTurnos()`.
   * Si devuelve null, la tarjeta se muestra sin botones.
   */
  function renderAcciones(turno: MiTurno) {
    if (turno.estado !== "confirmado") return null;

    return (
      <button
        type="button"
        onClick={() => setTurnoAReprogramar(turno)}
        className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
      >
        Reprogramar
      </button>
    );
  }

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Turnos</h1>
            <p className="text-slate-400 text-sm mt-1">Gestioná tus turnos médicos</p>
          </div>
          <Link
            href="/turnos/nuevo"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            + Nuevo Turno
          </Link>
        </div>

        {/* Pestañas por estado */}
        <div
          role="tablist"
          aria-label="Filtrar turnos"
          className="inline-flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mt-6"
        >
          {PESTANAS.map((p) => {
            const activa = pestana === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPestana(p.id)}
                className={
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition " +
                  (activa
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:bg-slate-800")
                }
              >
                {p.label}
                <span
                  className={
                    "text-xs rounded-full px-2 py-0.5 " +
                    (activa ? "bg-slate-950/20" : "bg-slate-800 text-slate-400")
                  }
                >
                  {cargando || errorMsg ? "–" : porPestana[p.id].length}
                </span>
              </button>
            );
          })}
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
          ) : turnosVisibles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300">{mensajeSinTurnos(pestana)}</p>
              {pestana === "proximos" && (
                <Link
                  href="/turnos/nuevo"
                  className="inline-block mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Solicitar un turno
                </Link>
              )}
            </div>
          ) : (
            turnosVisibles.map((turno) => (
              <TurnoCard key={turno.id} turno={turno} acciones={renderAcciones(turno)} />
            ))
          )}
        </section>

        {turnoAReprogramar && (
          <ModalReprogramar
            turno={turnoAReprogramar}
            onClose={() => setTurnoAReprogramar(null)}
            onSuccess={() => {
              setTurnoAReprogramar(null);
              cargarTurnos();
            }}
          />
        )}
      </main>
    </PatientShell>
  );
}
