"use client";

// Portal del Médico — modal para reprogramar el turno de un paciente.
// Los horarios libres salen del mismo endpoint público que usa el paciente
// (GET /api/turnos/horarios-disponibles), consultado para el médico logueado.

import { useEffect, useState } from "react";
import { getHorariosDisponibilidad } from "@/lib/services/turnoService";
import {
  MedicoRequestError,
  reprogramarTurnoMedico,
} from "@/lib/services/medicoService";
import { formatearFecha, hoyISO } from "@/lib/turnos/misTurnos";
import type { TurnoDelDia } from "@/lib/types/medico";
import type { HorarioDisponibilidad } from "@/lib/types/turno";

interface ModalReprogramarMedicoProps {
  turno: TurnoDelDia;
  profesionalId: number;
  onClose: () => void;
  /** Se llama después de reprogramar con éxito (la pantalla recarga la agenda). */
  onSuccess: () => void;
  /** Se llama si la API responde 401 (sesión vencida). */
  onSesionInvalida: () => void;
}

/** Hora local del navegador en formato HH:MM. */
function horaActual(): string {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(
    ahora.getMinutes()
  ).padStart(2, "0")}`;
}

export default function ModalReprogramarMedico({
  turno,
  profesionalId,
  onClose,
  onSuccess,
  onSesionInvalida,
}: ModalReprogramarMedicoProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  // Horarios cargados para una fecha puntual; se descartan si la fecha cambió.
  const [cargados, setCargados] = useState<{
    fecha: string;
    lista: HorarioDisponibilidad[];
  } | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const horarios = cargados && cargados.fecha === fecha ? cargados.lista : [];
  const cargandoHorarios = fecha !== "" && !(cargados && cargados.fecha === fecha);
  const hoy = hoyISO();

  useEffect(() => {
    if (!fecha) return;

    let vigente = true;
    getHorariosDisponibilidad(profesionalId, fecha)
      .then((lista) => {
        if (vigente) setCargados({ fecha, lista });
      })
      .catch(() => {
        if (vigente) setError("Error al cargar los horarios.");
      });

    return () => {
      vigente = false;
    };
  }, [fecha, profesionalId]);

  function cambiarFecha(nueva: string) {
    setFecha(nueva);
    setHora("");
    setError("");
  }

  async function confirmar() {
    setError("");
    setGuardando(true);
    try {
      await reprogramarTurnoMedico(turno.id, fecha, hora);
      onSuccess();
    } catch (err) {
      if (err instanceof MedicoRequestError && err.status === 401) {
        onSesionInvalida();
        return;
      }
      setError(
        err instanceof MedicoRequestError
          ? err.message
          : "No fue posible reprogramar el turno. Intente nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  }

  const paciente = turno.paciente
    ? `${turno.paciente.apellido}, ${turno.paciente.nombre}`
    : "el paciente";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reprogramar-medico"
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 id="titulo-reprogramar-medico" className="text-xl font-bold text-white mb-2">
          Reprogramar turno
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Turno de {paciente}: {formatearFecha(turno.fecha)} a las {turno.hora} hs.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="reprogramar-fecha" className="block text-sm text-slate-300 mb-1">
              Nueva fecha
            </label>
            <input
              id="reprogramar-fecha"
              type="date"
              value={fecha}
              min={hoy}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {cargandoHorarios && !error && (
            <p className="text-slate-500 text-sm" role="status">
              Cargando horarios...
            </p>
          )}

          {horarios.length > 0 && (
            <div>
              <span className="block text-sm text-slate-300 mb-1">Nuevo horario</span>
              <div className="grid grid-cols-3 gap-2">
                {horarios.map((h) => {
                  const pasado = fecha === hoy && h.hora <= horaActual();
                  const deshabilitado = h.ocupado || pasado;
                  return (
                    <button
                      key={h.hora}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => setHora(h.hora)}
                      className={`py-2 text-xs rounded-lg border transition ${
                        hora === h.hora
                          ? "bg-cyan-500 border-cyan-500 text-slate-950 font-semibold"
                          : deshabilitado
                          ? "border-slate-800 text-slate-600 line-through cursor-not-allowed"
                          : "border-slate-700 text-slate-300 hover:border-cyan-500/60"
                      }`}
                    >
                      {h.hora}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!fecha || !hora || guardando}
              onClick={confirmar}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 transition"
            >
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
