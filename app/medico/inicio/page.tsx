"use client";

// Portal del Médico — dashboard: métricas del día y agenda de hoy.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import ModalReprogramarMedico from "@/components/medico/ModalReprogramarMedico";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import {
  actualizarEstadoTurno,
  getDashboard,
  MedicoRequestError,
} from "@/lib/services/medicoService";
import { ETIQUETA_ESTADO } from "@/lib/turnos/misTurnos";
import type {
  DashboardMedico,
  EstadoAsignable,
  MetricasDelDia,
  TurnoDelDia,
} from "@/lib/types/medico";
import type { EstadoTurno } from "@/lib/types/turno";

const MENSAJE_ERROR_DASHBOARD = "No fue posible obtener la agenda del día.";

/** Suma (o resta) días a una fecha YYYY-MM-DD sin pasar por la zona horaria. */
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

const ESTILO_ESTADO: Record<EstadoTurno, string> = {
  confirmado: "bg-emerald-500/10 text-emerald-400",
  cancelado: "bg-red-500/10 text-red-400",
  atendido: "bg-cyan-500/10 text-cyan-400",
  pendiente: "bg-amber-500/10 text-amber-400",
};

/** Recalcula las métricas a partir de la lista (se usa al cambiar un estado). */
function calcularMetricas(turnos: TurnoDelDia[]): MetricasDelDia {
  const metricas: MetricasDelDia = {
    turnosHoy: turnos.length,
    confirmados: 0,
    pendientes: 0,
    cancelados: 0,
    atendidos: 0,
  };
  for (const t of turnos) {
    if (t.estado === "confirmado") metricas.confirmados += 1;
    else if (t.estado === "pendiente") metricas.pendientes += 1;
    else if (t.estado === "cancelado") metricas.cancelados += 1;
    else if (t.estado === "atendido") metricas.atendidos += 1;
  }
  return metricas;
}

/** "2026-11-02" -> "Lunes, 2 de noviembre" (sin pasar por UTC para evitar corrimientos). */
function fechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface TarjetaMetrica {
  clave: keyof MetricasDelDia;
  titulo: string;
  color: string;
}

const TARJETAS: TarjetaMetrica[] = [
  { clave: "turnosHoy", titulo: "Turnos hoy", color: "text-white" }, // "Turnos del día" si no es hoy
  { clave: "confirmados", titulo: "Confirmados", color: "text-emerald-400" },
  { clave: "pendientes", titulo: "Pendientes", color: "text-amber-400" },
  { clave: "atendidos", titulo: "Atendidos", color: "text-cyan-400" },
  { clave: "cancelados", titulo: "Cancelados", color: "text-red-400" },
];

export default function MedicoInicioPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  // Día que se está mirando. "" = hoy (lo resuelve el servidor, hora de Argentina).
  const [fechaSel, setFechaSel] = useState("");
  const [dashboard, setDashboard] = useState<DashboardMedico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [actualizandoId, setActualizandoId] = useState<number | null>(null);
  const [errorEstado, setErrorEstado] = useState("");

  // Turno que se está reprogramando (abre el modal) y aviso de éxito.
  const [turnoAReprogramar, setTurnoAReprogramar] = useState<TurnoDelDia | null>(null);
  const [mensajeOk, setMensajeOk] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getDashboard(fechaSel || undefined)
      .then((data) => {
        if (!vigente) return;
        setDashboard(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_DASHBOARD);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [medico, cerrarSesion, recarga, fechaSel]);

  /** Cambia el día que se mira (anterior, próximo, "Hoy" o elegido en el calendario). */
  const irAFecha = useCallback((fecha: string) => {
    setFechaSel(fecha);
    setCargando(true);
    setErrorMsg("");
    setErrorEstado("");
    setMensajeOk("");
  }, []);

  const reintentar = useCallback(() => {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }, []);

  const alReprogramar = useCallback(() => {
    setTurnoAReprogramar(null);
    setMensajeOk("El turno fue reprogramado correctamente.");
    setErrorEstado("");
    // Recarga la agenda: si el turno se movió a otro día, deja de figurar hoy.
    setRecarga((n) => n + 1);
  }, []);

  const cambiarEstado = useCallback(
    async (turno: TurnoDelDia, estado: EstadoAsignable) => {
      setActualizandoId(turno.id);
      setErrorEstado("");
      setMensajeOk("");

      try {
        const actualizado = await actualizarEstadoTurno(turno.id, estado);
        setDashboard((prev) => {
          if (!prev) return prev;
          const turnos = prev.turnos.map((t) =>
            t.id === actualizado.id ? { ...t, estado: actualizado.estado } : t
          );
          return { ...prev, turnos, metricas: calcularMetricas(turnos) };
        });
      } catch (err) {
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorEstado(
          err instanceof MedicoRequestError
            ? err.message
            : "No fue posible actualizar el estado del turno. Intente nuevamente."
        );
      } finally {
        setActualizandoId(null);
      }
    },
    [cerrarSesion]
  );

  const metricas = useMemo(
    () => dashboard?.metricas ?? null,
    [dashboard]
  );

  // Día mostrado respecto de hoy: define qué acciones tiene cada turno.
  const fechaMostrada = dashboard?.fecha ?? fechaSel;
  const hoy = dashboard?.hoy ?? "";
  const esHoy = Boolean(dashboard) && fechaMostrada === hoy;
  const esPasado = Boolean(dashboard) && fechaMostrada < hoy;
  const esFuturo = Boolean(dashboard) && fechaMostrada > hoy;

  if (!medico) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <DoctorShell medico={medico} onCerrarSesion={cerrarSesion}>
      <main className="flex-1 px-8 py-8">
        <h1 className="text-2xl font-bold text-white">Hola, {medico.nombre}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {!dashboard
            ? "Agenda"
            : esHoy
            ? `Agenda de hoy · ${fechaLarga(dashboard.fecha)}`
            : `Agenda del ${fechaLarga(dashboard.fecha)}`}
          {esPasado && (
            <span className="ml-2 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              Día anterior
            </span>
          )}
          {esFuturo && (
            <span className="ml-2 rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">
              Día próximo
            </span>
          )}
        </p>

        {/* Selector de fecha: días anteriores y próximos */}
        <div
          role="group"
          aria-label="Elegir día"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            aria-label="Día anterior"
            onClick={() => irAFecha(sumarDias(fechaMostrada, -1))}
            disabled={!dashboard}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ←
          </button>
          <label htmlFor="filtro-fecha" className="sr-only">
            Fecha de la agenda
          </label>
          <input
            id="filtro-fecha"
            type="date"
            value={fechaMostrada}
            onChange={(e) => {
              if (e.target.value) irAFecha(e.target.value);
            }}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            aria-label="Día siguiente"
            onClick={() => irAFecha(sumarDias(fechaMostrada, 1))}
            disabled={!dashboard}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => irAFecha("")}
            disabled={!dashboard || esHoy}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hoy
          </button>
        </div>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando agenda...
          </p>
        ) : errorMsg ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-4 text-sm text-red-300 flex items-center justify-between gap-4"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={reintentar}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-300 hover:bg-red-500/10 transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          dashboard &&
          metricas && (
            <>
              {/* Métricas del día */}
              <section
                aria-label="Métricas del día"
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6"
              >
                {TARJETAS.map((t) => (
                  <div
                    key={t.clave}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >
                    <p className="text-slate-400 text-sm">
                      {t.clave === "turnosHoy" && !esHoy ? "Turnos del día" : t.titulo}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${t.color}`}>
                      {metricas[t.clave]}
                    </p>
                  </div>
                ))}
              </section>

              {/* Turnos de hoy */}
              <section aria-label="Turnos del día" className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-3">
                  {esHoy ? "Turnos de hoy" : "Turnos del día"}
                </h2>

                {mensajeOk && (
                  <div
                    role="status"
                    className="mb-3 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
                  >
                    {mensajeOk}
                  </div>
                )}

                {errorEstado && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                  >
                    {errorEstado}
                  </div>
                )}

                {dashboard.turnos.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                    {esHoy
                      ? "No tenés turnos programados para hoy."
                      : "No tenés turnos en este día."}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {dashboard.turnos.map((turno) => {
                      const ocupado = actualizandoId === turno.id;
                      const cancelado = turno.estado === "cancelado";

                      return (
                        <li
                          key={turno.id}
                          data-testid="turno-del-dia"
                          className={
                            "bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5 " +
                            (cancelado ? "opacity-70" : "")
                          }
                        >
                          <div className="w-16 shrink-0 text-center">
                            <span className="text-white text-lg font-bold">
                              {turno.hora}
                            </span>
                            <span className="block text-slate-500 text-[10px] tracking-wider">
                              HS
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold">
                                {turno.paciente
                                  ? `${turno.paciente.apellido}, ${turno.paciente.nombre}`
                                  : "Paciente sin asignar"}
                              </h3>
                              <span
                                className={
                                  "text-xs font-semibold rounded-md px-2 py-0.5 " +
                                  ESTILO_ESTADO[turno.estado]
                                }
                              >
                                {ETIQUETA_ESTADO[turno.estado]}
                              </span>
                            </div>
                            {turno.paciente && (
                              <p className="text-slate-500 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>DNI {turno.paciente.dni}</span>
                                <span>
                                  {turno.paciente.obraSocial ?? "Sin obra social"}
                                </span>
                                <span>📞 {turno.paciente.telefono}</span>
                              </p>
                            )}
                          </div>

                          {!cancelado && (
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Reprogramar: hoy y días próximos (no tiene sentido en el pasado). */}
                              {!esPasado && turno.estado !== "atendido" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMensajeOk("");
                                    setErrorEstado("");
                                    setTurnoAReprogramar(turno);
                                  }}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Reprogramar
                                </button>
                              )}
                              {/* Atendido: hoy y días anteriores (no se atiende un turno futuro). */}
                              {!esFuturo && turno.estado !== "atendido" && (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(turno, "atendido")}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado ? "Guardando..." : "Marcar atendido"}
                                </button>
                              )}
                              {turno.estado !== "pendiente" && (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(turno, "pendiente")}
                                  disabled={actualizandoId !== null}
                                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {ocupado ? "Guardando..." : "Dejar pendiente"}
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

              </section>
            </>
          )
        )}
      </main>

      {turnoAReprogramar && (
        <ModalReprogramarMedico
          turno={turnoAReprogramar}
          profesionalId={medico.id}
          onClose={() => setTurnoAReprogramar(null)}
          onSuccess={alReprogramar}
          onSesionInvalida={cerrarSesion}
        />
      )}
    </DoctorShell>
  );
}
