"use client";

// HU-11 — Gestión de médicos: listado, alta y cambio de especialidad.

import { useCallback, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminData } from "@/lib/admin/useAdminData";
import {
  DOMINIO_EMAIL_MEDICO,
  formatearPrecio,
  formVacio,
  validarAltaMedico,
} from "@/lib/admin/altaMedico";
import {
  AdminRequestError,
  cambiarEspecialidad,
  crearMedico,
  getMedicos,
  getObrasSociales,
} from "@/lib/services/adminService";
import { getEspecialidades } from "@/lib/services/turnoService";
import type { AltaMedicoErrors, AltaMedicoField, AltaMedicoForm } from "@/lib/types/admin";

const CLASE_INPUT =
  "w-full rounded-lg bg-slate-800 border px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 ";

export default function MedicosPage() {
  // Médicos, especialidades y obras sociales se piden juntos.
  const cargar = useCallback(
    async () => {
      const [medicos, especialidades, obrasSociales] = await Promise.all([
        getMedicos(),
        getEspecialidades(),
        getObrasSociales(),
      ]);
      return { medicos, especialidades, obrasSociales };
    },
    []
  );
  const { admin, data, error, cargando, recargar, salir } = useAdminData(cargar);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<AltaMedicoForm>(formVacio);
  const [errores, setErrores] = useState<AltaMedicoErrors>({});
  const [errorEnvio, setErrorEnvio] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);

  if (!admin) return null;

  function cambiarCampo(campo: Exclude<AltaMedicoField, "obrasSocialesIds">, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function alternarObraSocial(id: number) {
    setForm((f) => ({
      ...f,
      obrasSocialesIds: f.obrasSocialesIds.includes(id)
        ? f.obrasSocialesIds.filter((x) => x !== id)
        : [...f.obrasSocialesIds, id],
    }));
  }

  function manejarErrorApi(err: unknown, porDefecto: string) {
    if (err instanceof AdminRequestError && (err.status === 401 || err.status === 403)) {
      salir();
      return null;
    }
    return err instanceof Error ? err.message : porDefecto;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");
    setErrorEnvio("");

    const nuevosErrores = validarAltaMedico(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      const { message } = await crearMedico(form);
      setMensaje(message);
      setForm(formVacio);
      setMostrarForm(false);
      recargar();
    } catch (err) {
      if (err instanceof AdminRequestError && err.errors) setErrores(err.errors);
      const texto = manejarErrorApi(err, "No fue posible dar de alta al médico.");
      if (texto) setErrorEnvio(texto);
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarEsp(medicoId: number, especialidadId: number) {
    setMensaje("");
    setErrorEnvio("");
    setCambiandoId(medicoId);
    try {
      const { message } = await cambiarEspecialidad(medicoId, especialidadId);
      setMensaje(message);
      recargar();
    } catch (err) {
      const texto = manejarErrorApi(err, "No fue posible cambiar la especialidad.");
      if (texto) setErrorEnvio(texto);
    } finally {
      setCambiandoId(null);
    }
  }

  function campoTexto(
    campo: Exclude<AltaMedicoField, "obrasSocialesIds" | "especialidadId">,
    etiqueta: string,
    opciones: { type?: string; placeholder?: string } = {}
  ) {
    return (
      <div>
        <label htmlFor={`m-${campo}`} className="mb-1 block text-sm text-slate-300">
          {etiqueta}
        </label>
        <input
          id={`m-${campo}`}
          type={opciones.type ?? "text"}
          value={form[campo]}
          onChange={(e) => cambiarCampo(campo, e.target.value)}
          placeholder={opciones.placeholder}
          aria-invalid={errores[campo] ? true : undefined}
          className={CLASE_INPUT + (errores[campo] ? "border-red-500" : "border-slate-700")}
        />
        {errores[campo] && <p className="mt-1 text-xs text-red-500">{errores[campo]}</p>}
      </div>
    );
  }

  return (
    <AdminShell admin={admin} onCerrarSesion={salir}>
      <main className="flex-1 px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Médicos</h1>
            <p className="mt-1 text-sm text-slate-400">Alta de profesionales y gestión de su especialidad</p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {mostrarForm ? "Cerrar formulario" : "+ Nuevo médico"}
          </button>
        </div>

        {mensaje && (
          <p role="status" className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {mensaje}
          </p>
        )}
        {errorEnvio && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {errorEnvio}
          </p>
        )}

        {mostrarForm && data && (
          <form
            onSubmit={enviar}
            noValidate
            className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
            aria-label="Alta de médico"
          >
            <h2 className="text-lg font-semibold text-white">Nuevo médico</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {campoTexto("nombre", "Nombre")}
              {campoTexto("apellido", "Apellido")}
              {campoTexto("matricula", "Matrícula", { placeholder: "Ej: 12345" })}
              {campoTexto("email", "Correo institucional", { placeholder: `ej: romanperez${DOMINIO_EMAIL_MEDICO}` })}

              <div>
                <label htmlFor="m-especialidad" className="mb-1 block text-sm text-slate-300">
                  Especialidad
                </label>
                <select
                  id="m-especialidad"
                  value={form.especialidadId}
                  onChange={(e) => cambiarCampo("especialidadId", e.target.value)}
                  aria-invalid={errores.especialidadId ? true : undefined}
                  className={CLASE_INPUT + (errores.especialidadId ? "border-red-500" : "border-slate-700")}
                >
                  <option value="">Seleccioná una especialidad</option>
                  {data.especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre}
                    </option>
                  ))}
                </select>
                {errores.especialidadId && <p className="mt-1 text-xs text-red-500">{errores.especialidadId}</p>}
              </div>

              {campoTexto("precioParticular", "Precio del turno particular ($)", { placeholder: "Ej: 25000" })}
              {campoTexto("passwordTemporal", "Contraseña temporal", { type: "password" })}
              {campoTexto("info", "Días y horarios (opcional)", {
                placeholder: "Ej: Atiende lunes a viernes de 8 a 12 hs.",
              })}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm text-slate-300">Obras sociales que atiende</legend>
              {errores.obrasSocialesIds && <p className="mb-2 text-xs text-red-500">{errores.obrasSocialesIds}</p>}
              <div className="flex flex-wrap gap-3">
                {data.obrasSociales.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.obrasSocialesIds.includes(o.id)}
                      onChange={() => alternarObraSocial(o.id)}
                    />
                    {o.nombre}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-xs text-slate-500">
              Los horarios iniciales los puede ajustar después el propio médico desde su perfil.
            </p>

            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Dar de alta"}
            </button>
          </form>
        )}

        {cargando && <p className="mt-8 text-slate-400" role="status">Cargando...</p>}

        {error && (
          <div role="alert" className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{error}</p>
            <button type="button" onClick={recargar} className="mt-2 underline">
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  {["Médico", "Matrícula", "Correo", "Especialidad", "Obras sociales", "Precio particular"].map((c) => (
                    <th key={c} scope="col" className="px-4 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.medicos.map((m) => (
                  <tr key={m.id} className="border-t border-slate-800 text-slate-300">
                    <td className="px-4 py-3 text-white">{m.nombre}</td>
                    <td className="px-4 py-3 text-slate-400">{m.matricula ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{m.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Especialidad de ${m.nombre}`}
                        value={m.especialidadId}
                        disabled={cambiandoId === m.id}
                        onChange={(e) => cambiarEsp(m.id, Number(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50"
                      >
                        {data.especialidades.map((esp) => (
                          <option key={esp.id} value={esp.id}>
                            {esp.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.obrasSociales.length ? m.obrasSociales.map((o) => o.nombre).join(", ") : "Solo particular"}
                    </td>
                    <td className="px-4 py-3">{formatearPrecio(m.precioParticular)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
