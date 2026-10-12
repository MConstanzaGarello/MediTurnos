// HU-04 — Tarjeta de un turno en "Mis turnos".
// Muestra los datos del criterio de aceptación: especialidad, profesional,
// fecha, horario y estado.
//
// `acciones` es el lugar para los botones de cada turno: HU-05 (Cancelar)
// y HU-06 (Reprogramar) los pasan desde la página sin tocar esta tarjeta.

import type { ReactNode } from "react";
import type { MiTurno } from "@/lib/types/turno";
import {
  ETIQUETA_ESTADO,
  extraerConsultorio,
  formatearFecha,
  partesFecha,
} from "@/lib/turnos/misTurnos";

const ESTILO_ESTADO: Record<MiTurno["estado"], string> = {
  confirmado: "bg-emerald-500/10 text-emerald-400",
  cancelado: "bg-red-500/10 text-red-400",
};

interface TurnoCardProps {
  turno: MiTurno;
  acciones?: ReactNode;
}

export function TurnoCard({ turno, acciones }: TurnoCardProps) {
  const { dia, mes } = partesFecha(turno.fecha);
  const consultorio = extraerConsultorio(turno.profesional.info);
  const cancelado = turno.estado === "cancelado";

  return (
    <article
      data-testid="turno-card"
      className={
        "bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5 " +
        (cancelado ? "opacity-70" : "")
      }
    >
      <div
        className="w-14 h-14 shrink-0 rounded-xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center"
        aria-label={formatearFecha(turno.fecha)}
      >
        <span className="text-white text-lg font-bold leading-none">{dia}</span>
        <span className="text-cyan-400 text-[10px] font-semibold tracking-wider mt-1">
          {mes}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-white font-semibold">{turno.profesional.nombre}</h3>
          <span
            className={
              "text-xs font-semibold rounded-md px-2 py-0.5 " + ESTILO_ESTADO[turno.estado]
            }
          >
            {ETIQUETA_ESTADO[turno.estado]}
          </span>
        </div>
        <p className="text-slate-400 text-sm mt-1">{turno.especialidad.nombre}</p>
        <p className="text-slate-500 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            📅 {formatearFecha(turno.fecha)}
          </span>
          <span>🕒 {turno.hora} hs</span>
          {consultorio && <span>📍 {consultorio}</span>}
        </p>
      </div>

      {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
    </article>
  );
}
