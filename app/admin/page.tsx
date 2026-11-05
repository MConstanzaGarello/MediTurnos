"use client";

// HU-11 — Dashboard administrativo: resumen y turnos del día.

import { useCallback, useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminData } from "@/lib/admin/useAdminData";
import {
  FILTROS,
  filtrarTurnos,
  formatearFechaLarga,
  MENSAJE_ERROR_DASHBOARD,
  MENSAJE_SIN_COINCIDENCIAS,
  MENSAJE_SIN_TURNOS_HOY,
  type FiltroEstado,
} from "@/lib/admin/dashboard";
import { getDashboard } from "@/lib/services/adminService";

function Tarjeta({ titulo, valor, color }: { titulo: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const cargar = useCallback(() => getDashboard(), []);
  const { admin, data, error, cargando, recargar, salir } = useAdminData(cargar);

  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [busqueda, setBusqueda] = useState("");

  const turnosVisibles = useMemo(
    () => (data ? filtrarTurnos(data.turnos, filtro, busqueda) : []),
    [data, filtro, busqueda]
  );

  if (!admin) return null;

  return (
    <AdminShell admin={admin} onCerrarSesion={salir}>
      <main className="flex-1 px-8 py-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Resumen del día{data ? ` — ${formatearFechaLarga(data.fecha)}` : ""}
        </p>

        {cargando && <p className="mt-8 text-slate-400" role="status">Cargando...</p>}

        {error && (
          <div role="alert" className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{error || MENSAJE_ERROR_DASHBOARD}</p>
            <button type="button" onClick={recargar} className="mt-2 underline">
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Tarjeta titulo="Total turnos" valor={data.resumen.total} color="text-white" />
              <Tarjeta titulo="Confirmados" valor={data.resumen.confirmados} color="text-emerald-400" />
              <Tarjeta titulo="Cancelados" valor={data.resumen.cancelados} color="text-red-400" />
            </div>

            <section className="mt-8" aria-labelledby="titulo-turnos-hoy">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titulo-turnos-hoy" className="text-lg font-semibold text-white">
                  Turnos de hoy
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar paciente, DNI, médico..."
                    aria-label="Buscar turnos"
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {FILTROS.map((f) => (
                    <button
                      key={f.valor}
                      type="button"
                      onClick={() => setFiltro(f.valor)}
                      aria-pressed={filtro === f.valor}
                      className={
                        "rounded-lg px-3 py-2 text-sm transition " +
                        (filtro === f.valor
                          ? "bg-cyan-500 font-semibold text-slate-950"
                          : "border border-slate-700 text-slate-300 hover:bg-slate-800")
                      }
                    >
                      {f.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {data.turnos.length === 0 ? (
                <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                  {MENSAJE_SIN_TURNOS_HOY}
                </p>
              ) : turnosVisibles.length === 0 ? (
                <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                  {MENSAJE_SIN_COINCIDENCIAS}
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        {["Hora", "Paciente", "DNI", "Profesional", "Especialidad", "Estado"].map((c) => (
                          <th key={c} scope="col" className="px-4 py-3 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {turnosVisibles.map((t) => (
                        <tr key={t.id} className="border-t border-slate-800 text-slate-300">
                          <td className="px-4 py-3 font-semibold text-white">{t.hora}</td>
                          <td className="px-4 py-3">{t.paciente}</td>
                          <td className="px-4 py-3 text-slate-400">{t.dni}</td>
                          <td className="px-4 py-3">{t.profesional}</td>
                          <td className="px-4 py-3 text-slate-400">{t.especialidad}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "rounded-full px-2.5 py-1 text-xs font-semibold " +
                                (t.estado === "confirmado"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-red-500/15 text-red-400")
                              }
                            >
                              {t.estado === "confirmado" ? "Confirmado" : "Cancelado"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AdminShell>
  );
}
