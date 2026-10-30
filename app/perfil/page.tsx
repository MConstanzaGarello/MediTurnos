
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientShell } from "@/components/layout/PatientShell";
import { clearSession } from "@/lib/auth/session";
import { useSessionPatient } from "@/lib/auth/useSessionPatient";
import {
  getPatientProfile,
  updatePatientProfile,
  PatientProfileRequestError,
} from "@/lib/services/patientService";
import type { PatientResponse } from "@/lib/types/patient";

interface ProfileForm {
  nombre: string;
  apellido: string;
  telefono: string;
  fechaNacimiento: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const sessionPatient = useSessionPatient();

  const [perfil, setPerfil] = useState<PatientResponse | null>(null);
  const [formulario, setFormulario] = useState<ProfileForm>({
    nombre: "",
    apellido: "",
    telefono: "",
    fechaNacimiento: "",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const cerrarSesionYSalir = useCallback(() => {
    clearSession();
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (sessionPatient === undefined) return;

    if (sessionPatient === null) {
      router.replace("/");
      return;
    }

    let vigente = true;

    getPatientProfile()
      .then((data) => {
        if (!vigente) return;

        setPerfil(data);
        setFormulario({
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          fechaNacimiento: data.fechaNacimiento.slice(0, 10),
        });
        setErrorMsg("");
      })
      .catch((error) => {
        if (!vigente) return;

        if (
          error instanceof PatientProfileRequestError &&
          error.status === 401
        ) {
          cerrarSesionYSalir();
          return;
        }

        setErrorMsg("No fue posible obtener los datos del perfil.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [sessionPatient, router, cerrarSesionYSalir]);

  function cambiarCampo(campo: keyof ProfileForm, valor: string) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setErrores((actual) => ({
      ...actual,
      [campo]: "",
    }));

    setMensajeExito("");
  }

  async function guardarCambios(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setErrorMsg("");
    setMensajeExito("");
    setErrores({});

    try {
      const pacienteActualizado = await updatePatientProfile(formulario);

      setPerfil(pacienteActualizado);
      setFormulario({
        nombre: pacienteActualizado.nombre,
        apellido: pacienteActualizado.apellido,
        telefono: pacienteActualizado.telefono,
        fechaNacimiento: pacienteActualizado.fechaNacimiento.slice(0, 10),
      });

      setMensajeExito("Perfil actualizado correctamente.");
    } catch (error) {
      if (
        error instanceof PatientProfileRequestError &&
        error.status === 401
      ) {
        cerrarSesionYSalir();
        return;
      }

      if (
        error instanceof PatientProfileRequestError &&
        error.errors
      ) {
        setErrores(error.errors);
      } else {
        setErrorMsg("No fue posible actualizar el perfil.");
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!sessionPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <PatientShell
      paciente={sessionPatient}
      onCerrarSesion={cerrarSesionYSalir}
    >
      <main className="flex-1 px-8 py-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
          <p className="text-slate-400 text-sm mt-1">
            Consultá y actualizá tus datos personales.
          </p>
        </div>

        <section className="mt-6 max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {cargando ? (
            <p className="text-slate-400 text-sm">
              Cargando datos del perfil...
            </p>
          ) : errorMsg && !perfil ? (
            <div>
              <p className="text-red-400 text-sm">{errorMsg}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-slate-200 border border-slate-700 hover:border-cyan-500/60 rounded-lg px-4 py-2 transition"
              >
                Reintentar
              </button>
            </div>
          ) : perfil ? (
            <form onSubmit={guardarCambios} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) => cambiarCampo("nombre", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                    required
                  />
                  {errores.nombre && (
                    <p className="text-red-400 text-xs mt-1">
                      {errores.nombre}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={formulario.apellido}
                    onChange={(e) => cambiarCampo("apellido", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                    required
                  />
                  {errores.apellido && (
                    <p className="text-red-400 text-xs mt-1">
                      {errores.apellido}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    DNI
                  </label>
                  <input
                    type="text"
                    value={perfil.dni}
                    readOnly
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={perfil.email}
                    readOnly
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formulario.telefono}
                    onChange={(e) => cambiarCampo("telefono", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                    required
                  />
                  {errores.telefono && (
                    <p className="text-red-400 text-xs mt-1">
                      {errores.telefono}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={formulario.fechaNacimiento}
                    onChange={(e) =>
                      cambiarCampo("fechaNacimiento", e.target.value)
                    }
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                    required
                  />
                  {errores.fechaNacimiento && (
                    <p className="text-red-400 text-xs mt-1">
                      {errores.fechaNacimiento}
                    </p>
                  )}
                </div>
              </div>

              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}

              {mensajeExito && (
                <p className="text-green-400 text-sm">{mensajeExito}</p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg px-6 py-3 text-sm transition"
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </main>
    </PatientShell>
  );
}
