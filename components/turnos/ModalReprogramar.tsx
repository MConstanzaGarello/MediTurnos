"use client";

import { useState, useEffect } from "react";
import { getHorariosDisponibilidad } from "@/lib/services/turnoService";
import { getToken } from "@/lib/auth/session";
import type { MiTurno, HorarioDisponibilidad } from "@/lib/types/turno";
import { formatearFecha } from "@/lib/turnos/misTurnos";

interface ModalReprogramarProps {
  turno: MiTurno;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalReprogramar({ turno, onClose, onSuccess }: ModalReprogramarProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horarios, setHorarios] = useState<HorarioDisponibilidad[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (fecha) {
      getHorariosDisponibilidad(turno.profesional.id, fecha)
        .then(setHorarios)
        .catch(() => setError("Error al cargar horarios."));
    } else {
      setHorarios([]);
    }
    setHora("");
  }, [fecha, turno.profesional.id]);

  const handleReprogramar = async () => {
    setError("");
    setCargando(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/turnos/${turno.id}/reprogramar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ fecha, hora }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al reprogramar el turno.");
      
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reprogramar el turno.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Reprogramar Turno</h2>
        <p className="text-sm text-slate-400 mb-6">
          Original: {formatearFecha(turno.fecha)} a las {turno.hora} hs con {turno.profesional.nombre}.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nueva Fecha</label>
            <input 
              type="date" 
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              onChange={(e) => setFecha(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {horarios.length > 0 && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nuevo Horario</label>
              <div className="grid grid-cols-3 gap-2">
                {horarios.map((h) => (
                  <button
                    key={h.hora}
                    disabled={h.ocupado}
                    onClick={() => setHora(h.hora)}
                    className={`py-2 text-xs rounded-lg border transition ${
                      hora === h.hora 
                        ? "bg-cyan-500 border-cyan-500 text-slate-950 font-semibold" 
                        : h.ocupado 
                        ? "border-slate-800 text-slate-600 line-through cursor-not-allowed" 
                        : "border-slate-700 text-slate-300 hover:border-cyan-500/60"
                    }`}
                  >
                    {h.hora}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex gap-3 mt-8">
            <button 
              onClick={onClose} 
              disabled={cargando}
              className="flex-1 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button 
              disabled={!fecha || !hora || cargando} 
              onClick={handleReprogramar} 
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 transition"
            >
              {cargando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
