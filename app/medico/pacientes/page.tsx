"use client";

// Portal del Médico — historial de pacientes atendidos.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import { getPacientes, MedicoRequestError } from "@/lib/services/medicoService";
import { formatearFecha } from "@/lib/turnos/misTurnos";
import type { PacienteAtendido } from "@/lib/types/medico";

const MENSAJE_ERROR_PACIENTES = "No fue posible obtener la lista de pacientes.";

/** Normaliza para buscar sin importar mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function MedicoPacientesPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  const [pacientes, setPacientes] = useState<PacienteAtendido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getPacientes()
      .then((data) => {
        if (!vigente) return;
        setPacientes(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_PACIENTES);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [medico, cerrarSesion, recarga]);

  const reintentar = useCallback(() => {
    setCargando(true);
    setErrorMsg("");
    setRecarga((n) => n + 1);
  }, []);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      normalizar(`${p.apellido} ${p.nombre} ${p.dni}`).includes(q)
    );
  }, [pacientes, busqueda]);

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Pacientes</h1>
            <p className="text-slate-400 text-sm mt-1">
              Pacientes que ya atendiste
            </p>
          </div>

          {!cargando && !errorMsg && pacientes.length > 0 && (
            <div>
              <label htmlFor="buscar-paciente" className="sr-only">
                Buscar paciente
              </label>
              <input
                id="buscar-paciente"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o DNI"
                className="w-72 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          )}
        </div>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando pacientes...
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
        ) : pacientes.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            Todavía no atendiste pacientes. Cuando marques un turno como
            atendido, el paciente va a aparecer acá.
          </div>
        ) : visibles.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No se encontraron pacientes con esa búsqueda.
          </div>
        ) : (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th scope="col" className="px-5 py-3 font-medium">Paciente</th>
                  <th scope="col" className="px-5 py-3 font-medium">DNI</th>
                  <th scope="col" className="px-5 py-3 font-medium">Obra social</th>
                  <th scope="col" className="px-5 py-3 font-medium">Última visita</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr
                    key={p.id}
                    data-testid="paciente-row"
                    className="border-b border-slate-800/60 last:border-b-0"
                  >
                    <td className="px-5 py-4 text-white font-medium">
                      {p.apellido}, {p.nombre}
                    </td>
                    <td className="px-5 py-4 text-slate-300">{p.dni}</td>
                    <td className="px-5 py-4 text-slate-300">
                      {p.obraSocial ?? "Sin obra social"}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {formatearFecha(p.ultimaVisita)}
                    </td>
                    <td className="px-5 py-4 text-slate-300 text-right">
                      {p.totalVisitas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </DoctorShell>
  );
}
