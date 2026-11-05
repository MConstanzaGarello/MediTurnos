"use client";

// HU-12 — Reportes estadísticos del mes.

import { useCallback, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminData } from "@/lib/admin/useAdminData";
import {
  etiquetaMes,
  MENSAJE_ERROR_REPORTE,
  MENSAJE_SIN_DATOS_REPORTE,
  mesActualLocal,
  mesesParaSelector,
  porcentajeDelMaximo,
} from "@/lib/admin/reportes";
import { getReporte } from "@/lib/services/adminService";

function Tarjeta({ titulo, valor, color }: { titulo: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}

export default function ReportesPage() {
  const [mes, setMes] = useState(() => mesActualLocal());
  const cargar = useCallback(() => getReporte(mes), [mes]);
  const { admin, data, error, cargando, recargar, salir } = useAdminData(cargar);

  if (!admin) return null;

  const maxEspecialidad = Math.max(0, ...(data?.porEspecialidad.map((e) => e.cantidad) ?? []));
  const maxFranja = Math.max(0, ...(data?.franjas.map((f) => f.cantidad) ?? []));

  return (
    <AdminShell admin={admin} onCerrarSesion={salir}>
      <main className="flex-1 px-8 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Reportes</h1>
            <p className="mt-1 text-sm text-slate-400">Estadísticas y métricas del sistema</p>
          </div>
          <label className="text-sm text-slate-400">
            Período{" "}
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="ml-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-400"
            >
              {mesesParaSelector(mesActualLocal()).map((m) => (
                <option key={m} value={m}>
                  {etiquetaMes(m)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {cargando && <p className="mt-8 text-slate-400" role="status">Cargando...</p>}

        {error && (
          <div role="alert" className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{error || MENSAJE_ERROR_REPORTE}</p>
            <button type="button" onClick={recargar} className="mt-2 underline">
              Reintentar
            </button>
          </div>
        )}

        {data && data.totales.total === 0 && (
          <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            {MENSAJE_SIN_DATOS_REPORTE}
          </p>
        )}

        {data && data.totales.total > 0 && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tarjeta titulo="Total turnos" valor={data.totales.total} color="text-white" />
              <Tarjeta titulo="Realizados" valor={data.totales.realizados} color="text-emerald-400" />
              <Tarjeta titulo="Próximos" valor={data.totales.proximos} color="text-amber-400" />
              <Tarjeta titulo="Cancelados" valor={data.totales.cancelados} color="text-red-400" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="rep-esp">
                <h2 id="rep-esp" className="font-semibold text-white">Turnos por especialidad</h2>
                <ul className="mt-4 space-y-3">
                  {data.porEspecialidad.map((e) => (
                    <li key={e.especialidad}>
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>{e.especialidad}</span>
                        <span>{e.cantidad}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-slate-800">
                        <div
                          className="h-2 rounded bg-cyan-500"
                          style={{ width: `${porcentajeDelMaximo(e.cantidad, maxEspecialidad)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="rep-cancel">
                <h2 id="rep-cancel" className="font-semibold text-white">Cancelaciones</h2>
                <div className="mt-4 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <span className="text-sm text-red-300">Tasa de cancelación del mes</span>
                  <span className="text-2xl font-bold text-red-400">{data.totales.tasaCancelacion}%</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {data.totales.cancelados} turnos cancelados sobre {data.totales.total} solicitados en{" "}
                  {etiquetaMes(data.mes)}.
                </p>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="rep-franjas">
                <h2 id="rep-franjas" className="font-semibold text-white">Franjas de solicitud de turnos</h2>
                <ul className="mt-4 flex h-40 items-end gap-4" aria-label="Turnos por franja horaria">
                  {data.franjas.map((f) => (
                    <li key={f.franja} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs text-slate-300">{f.cantidad}</span>
                      <div
                        className="w-full rounded-t bg-cyan-500"
                        style={{ height: `${Math.max(porcentajeDelMaximo(f.cantidad, maxFranja), 3)}px` }}
                      />
                      <span className="text-[11px] text-slate-500">{f.franja}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="rep-prof">
                <h2 id="rep-prof" className="font-semibold text-white">Profesionales con más turnos</h2>
                <table className="mt-4 w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 font-medium">Profesional</th>
                      <th scope="col" className="py-2 font-medium">Especialidad</th>
                      <th scope="col" className="py-2 text-right font-medium">Confirmados</th>
                      <th scope="col" className="py-2 text-right font-medium">Cancelados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profesionales.map((p) => (
                      <tr key={p.profesionalId} className="border-t border-slate-800 text-slate-300">
                        <td className="py-2 text-white">{p.nombre}</td>
                        <td className="py-2 text-slate-400">{p.especialidad}</td>
                        <td className="py-2 text-right text-emerald-400">{p.confirmados}</td>
                        <td className="py-2 text-right text-red-400">{p.cancelados}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        )}
      </main>
    </AdminShell>
  );
}
