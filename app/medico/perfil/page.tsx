"use client";

// Portal del Médico — perfil. Los datos personales y la matrícula los gestiona
// un Administrativo (solo lectura); el médico puede editar sus días de
// atención y su horario/detalle.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useRequireMedico } from "@/lib/auth/useRequireMedico";
import {
  actualizarPerfil,
  getPerfil,
  MedicoRequestError,
} from "@/lib/services/medicoService";
import { extraerConsultorio } from "@/lib/turnos/misTurnos";
import type { PerfilMedico } from "@/lib/types/medico";

const MENSAJE_ERROR_PERFIL = "No fue posible obtener tu perfil.";
const NO_INFORMADO = "No informado";
const MAX_DIAS_ATENCION = 150;
const MAX_INFO = 255;

interface ErroresEdicion {
  diasAtencion?: string;
  info?: string;
}

function iniciales(nombre: string): string {
  // Ignora el título ("Dr.", "Dra.") para que "Dr. Román López" sea "RL".
  const partes = nombre
    .replace(/^(dr|dra)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500 text-xs uppercase tracking-wider">{etiqueta}</dt>
      <dd className="text-slate-200 text-sm mt-1">{children}</dd>
    </div>
  );
}

export default function MedicoPerfilPage() {
  const { medico, cerrarSesion } = useRequireMedico();

  const [perfil, setPerfil] = useState<PerfilMedico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recarga, setRecarga] = useState(0);

  // Edición de días de atención y horario/detalle.
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ diasAtencion: "", info: "" });
  const [erroresForm, setErroresForm] = useState<ErroresEdicion>({});
  const [errorGuardar, setErrorGuardar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeOk, setMensajeOk] = useState("");

  useEffect(() => {
    if (!medico) return;

    let vigente = true;

    getPerfil()
      .then((data) => {
        if (!vigente) return;
        setPerfil(data);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorMsg(MENSAJE_ERROR_PERFIL);
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

  const empezarEdicion = useCallback(() => {
    if (!perfil) return;
    setForm({ diasAtencion: perfil.diasAtencion ?? "", info: perfil.info });
    setErroresForm({});
    setErrorGuardar("");
    setMensajeOk("");
    setEditando(true);
  }, [perfil]);

  const cancelarEdicion = useCallback(() => {
    setEditando(false);
    setErroresForm({});
    setErrorGuardar("");
  }, []);

  const guardar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorGuardar("");

      const diasAtencion = form.diasAtencion.trim();
      const info = form.info.trim();
      const errores: ErroresEdicion = {};

      if (!diasAtencion) {
        errores.diasAtencion = "Ingresá los días de atención.";
      } else if (diasAtencion.length > MAX_DIAS_ATENCION) {
        errores.diasAtencion = `No puede superar los ${MAX_DIAS_ATENCION} caracteres.`;
      }
      if (!info) {
        errores.info = "Ingresá el horario y detalle de atención.";
      } else if (info.length > MAX_INFO) {
        errores.info = `No puede superar los ${MAX_INFO} caracteres.`;
      }

      setErroresForm(errores);
      if (Object.keys(errores).length > 0) return;

      setGuardando(true);
      try {
        const actualizado = await actualizarPerfil({ diasAtencion, info });
        setPerfil(actualizado);
        setEditando(false);
        setMensajeOk("Tus datos de atención se actualizaron correctamente.");
      } catch (err) {
        if (err instanceof MedicoRequestError && err.status === 401) {
          cerrarSesion();
          return;
        }
        setErrorGuardar(
          err instanceof MedicoRequestError
            ? err.message
            : "No fue posible guardar los cambios. Intentá nuevamente."
        );
      } finally {
        setGuardando(false);
      }
    },
    [form, cerrarSesion]
  );

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
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        <p className="text-slate-400 text-sm mt-1">
          Tus datos personales y profesionales
        </p>

        {cargando ? (
          <p className="text-slate-500 text-sm mt-8" role="status">
            Cargando perfil...
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
          perfil && (
            <div className="mt-6 max-w-3xl space-y-6">
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
                <span
                  aria-hidden="true"
                  className="w-16 h-16 rounded-full bg-cyan-500 text-slate-950 text-xl font-bold flex items-center justify-center"
                >
                  {iniciales(perfil.nombre)}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{perfil.nombre}</h2>
                  <p className="text-cyan-400 text-sm mt-1">
                    {perfil.especialidad.nombre}
                  </p>
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">Datos personales</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Dato etiqueta="Nombre">{perfil.nombre}</Dato>
                  <Dato etiqueta="Correo electrónico">{perfil.email}</Dato>
                  <Dato etiqueta="Teléfono">{perfil.telefono ?? NO_INFORMADO}</Dato>
                </dl>
              </section>

              {mensajeOk && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
                >
                  {mensajeOk}
                </div>
              )}

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-white font-semibold">Datos profesionales</h2>
                  {!editando && (
                    <button
                      type="button"
                      onClick={empezarEdicion}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      Editar días y horario
                    </button>
                  )}
                </div>

                {editando ? (
                  <form onSubmit={guardar} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="perfil-dias" className="block text-sm text-slate-300 mb-1">
                        Días de atención
                      </label>
                      <input
                        id="perfil-dias"
                        type="text"
                        value={form.diasAtencion}
                        maxLength={MAX_DIAS_ATENCION}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, diasAtencion: e.target.value }));
                          setErroresForm((er) => ({ ...er, diasAtencion: undefined }));
                        }}
                        placeholder="Ej: Lunes a Viernes"
                        className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                          erroresForm.diasAtencion ? "border-red-500" : "border-slate-700"
                        }`}
                      />
                      {erroresForm.diasAtencion && (
                        <p className="text-red-500 text-xs mt-1">{erroresForm.diasAtencion}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="perfil-info" className="block text-sm text-slate-300 mb-1">
                        Horario y detalle
                      </label>
                      <textarea
                        id="perfil-info"
                        rows={4}
                        value={form.info}
                        maxLength={MAX_INFO}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, info: e.target.value }));
                          setErroresForm((er) => ({ ...er, info: undefined }));
                        }}
                        placeholder="Ej: Atiende lunes a viernes de 8 a 14 hs. Consultorio N° 11."
                        className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 resize-none ${
                          erroresForm.info ? "border-red-500" : "border-slate-700"
                        }`}
                      />
                      <div className="flex justify-between gap-4 mt-1">
                        <p className="text-slate-500 text-xs">
                          Para que los pacientes vean tu consultorio, incluí el texto
                          «Consultorio N° 11» (con tu número).
                        </p>
                        <span className="text-slate-500 text-xs shrink-0">
                          {form.info.length}/{MAX_INFO}
                        </span>
                      </div>
                      {erroresForm.info && (
                        <p className="text-red-500 text-xs mt-1">{erroresForm.info}</p>
                      )}
                    </div>

                    {errorGuardar && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                      >
                        {errorGuardar}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="rounded-lg px-4 py-2.5 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando}
                        className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-slate-950 transition"
                      >
                        {guardando ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Dato etiqueta="Especialidad">{perfil.especialidad.nombre}</Dato>
                    <Dato etiqueta="Matrícula">{perfil.matricula ?? NO_INFORMADO}</Dato>
                    <Dato etiqueta="Días de atención">
                      {perfil.diasAtencion ?? NO_INFORMADO}
                    </Dato>
                    <Dato etiqueta="Consultorio">
                      {extraerConsultorio(perfil.info) ?? NO_INFORMADO}
                    </Dato>
                    <div className="sm:col-span-2">
                      <Dato etiqueta="Horario y detalle">{perfil.info}</Dato>
                    </div>
                  </dl>
                )}
              </section>

              <p className="text-slate-600 text-xs">
                Para modificar tu nombre, correo, teléfono o matrícula comunicate con Administración.
              </p>
            </div>
          )
        )}
      </main>
    </DoctorShell>
  );
}
