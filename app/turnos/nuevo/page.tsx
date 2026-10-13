"use client";

// HU-03: Solicitar turno — conectado al backend real (especialidades,
// profesionales, disponibilidad de horarios y creación del turno).
// Ya no usa datos MOCK: todo viene de lib/services/turnoService.ts.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTurno,
  getEspecialidades,
  getHorariosDisponibilidad,
  getProfesionales,
  TurnoRequestError,
} from "@/lib/services/turnoService";
import type {
  Especialidad,
  HorarioDisponibilidad,
  Profesional,
} from "@/lib/types/turno";
import { clearSession, getSession, type SessionPatient } from "@/lib/auth/session";
import { PatientShell } from "@/components/layout/PatientShell";

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildWeeks(viewDate: Date): (number | null)[][] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7; // 0=lunes..6=domingo

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export default function NuevoTurnoPage() {
  const router = useRouter();
  const [sessionPatient, setSessionPatient] = useState<SessionPatient | null>(
    null
  );
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // HU-03 requiere ser un paciente registrado y logueado. Si no hay
  // sesión guardada (ver lib/auth/session.ts), no tiene sentido mostrar
  // esta pantalla: se redirige al login.
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/");
      return;
    }
    setSessionPatient(session.paciente);
    setVerificandoSesion(false);
  }, [router]);

  function handleCerrarSesion() {
    clearSession();
    router.push("/");
  }

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [especialidadId, setEspecialidadId] = useState<number | "">("");

  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profesionalId, setProfesionalId] = useState<number | "">("");

  const [fecha, setFecha] = useState<Date | null>(null);
  const [hora, setHora] = useState("");
  const [horarios, setHorarios] = useState<HorarioDisponibilidad[]>([]);

  const [viewDate, setViewDate] = useState(() => {
    const t = startOfDay(new Date());
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const today = startOfDay(new Date());
  const weeks = useMemo(() => buildWeeks(viewDate), [viewDate]);
  const monthLabel = useMemo(() => {
    const label = viewDate.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [viewDate]);

  const esMesActual =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  const profesionalInfo = profesionales.find((p) => p.id === profesionalId);
  const especialidadNombre =
    especialidades.find((e) => e.id === especialidadId)?.nombre ?? "";

  const hayHorariosDisponibles = horarios.some((h) => !h.ocupado);

  // Cargar especialidades al entrar a la pantalla.
  useEffect(() => {
    let cancelado = false;
    setCargandoEspecialidades(true);
    getEspecialidades()
      .then((data) => {
        if (!cancelado) setEspecialidades(data);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorMsg(
            err instanceof TurnoRequestError
              ? err.message
              : "No se pudo cargar el listado de especialidades."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoEspecialidades(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Cargar profesionales cuando cambia la especialidad elegida.
  useEffect(() => {
    if (especialidadId === "") {
      setProfesionales([]);
      return;
    }
    let cancelado = false;
    setCargandoProfesionales(true);
    getProfesionales(especialidadId)
      .then((data) => {
        if (!cancelado) setProfesionales(data);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorMsg(
            err instanceof TurnoRequestError
              ? err.message
              : "No se pudo cargar el listado de profesionales."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoProfesionales(false);
      });
    return () => {
      cancelado = true;
    };
  }, [especialidadId]);

  // Cargar disponibilidad de horarios cuando hay profesional + fecha.
  useEffect(() => {
    if (profesionalId === "" || !fecha) {
      setHorarios([]);
      return;
    }
    let cancelado = false;
    setCargandoHorarios(true);
    getHorariosDisponibilidad(profesionalId, toISO(fecha))
      .then((data) => {
        if (!cancelado) setHorarios(data);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorMsg(
            err instanceof TurnoRequestError
              ? err.message
              : "No se pudo obtener la disponibilidad de horarios."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoHorarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, [profesionalId, fecha]);

  function handleEspecialidadChange(value: string) {
    setEspecialidadId(value ? Number(value) : "");
    setProfesionalId("");
    setFecha(null);
    setHora("");
    setErrorMsg("");
    setSuccessMsg("");
  }

  function handleProfesionalChange(value: string) {
    setProfesionalId(value ? Number(value) : "");
    setFecha(null);
    setHora("");
    setErrorMsg("");
    setSuccessMsg("");
  }

  function handleSeleccionarDia(dia: number | null) {
    if (dia === null) return;
    const candidata = new Date(viewDate.getFullYear(), viewDate.getMonth(), dia);
    if (candidata < today) return; // no permitir fechas anteriores al día actual
    setFecha(candidata);
    setHora("");
    setErrorMsg("");
    setSuccessMsg("");
  }

  function handleSeleccionarHora(h: HorarioDisponibilidad) {
    if (h.ocupado) return;
    setHora(h.hora);
    setErrorMsg("");
    setSuccessMsg("");
  }

  async function handleConfirmar() {
    setSuccessMsg("");

    if (!especialidadId) {
      setErrorMsg("Seleccione una especialidad.");
      return;
    }
    if (!profesionalId) {
      setErrorMsg("Seleccione un profesional.");
      return;
    }
    if (!fecha) {
      setErrorMsg("Seleccione una fecha.");
      return;
    }
    if (!hora) {
      setErrorMsg("Seleccione un horario disponible.");
      return;
    }

    setConfirmando(true);
    try {
      await createTurno({
        especialidadId,
        profesionalId,
        fecha: toISO(fecha),
        hora,
      });

      setErrorMsg("");
      setSuccessMsg("Turno solicitado correctamente.");
      setEspecialidadId("");
      setProfesionalId("");
      setFecha(null);
      setHora("");
    } catch (err) {
      if (err instanceof TurnoRequestError) {
        if (err.status === 401) {
          clearSession();
          router.push("/");
          return;
        }
        const primerError = err.errors ? Object.values(err.errors)[0] : undefined;
        setErrorMsg(primerError ?? err.message);
        // Si el horario ya no está disponible, refrescamos la grilla.
        if (err.status === 409 && fecha && profesionalId) {
          getHorariosDisponibilidad(profesionalId, toISO(fecha))
            .then(setHorarios)
            .catch(() => {});
        }
      } else {
        setErrorMsg("No fue posible solicitar el turno. Intente nuevamente.");
      }
    } finally {
      setConfirmando(false);
    }
  }

  if (verificandoSesion || !sessionPatient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <PatientShell paciente={sessionPatient} onCerrarSesion={handleCerrarSesion}>
        <main className="flex-1 px-8 py-8">
          <h1 className="text-2xl font-bold text-white">
            Solicitar Nuevo Turno
          </h1>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            Completá los pasos para reservar tu turno médico
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda: pasos 1 y 2 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Paso 1: especialidad y profesional */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-white font-semibold">
                    Elegir especialidad y profesional
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Especialidad
                    </label>
                    <select
                      value={especialidadId}
                      onChange={(e) => handleEspecialidadChange(e.target.value)}
                      disabled={cargandoEspecialidades}
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:text-slate-500"
                    >
                      <option value="" disabled>
                        {cargandoEspecialidades
                          ? "Cargando especialidades..."
                          : "Seleccioná una especialidad"}
                      </option>
                      {especialidades.map((esp) => (
                        <option key={esp.id} value={esp.id}>
                          {esp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Profesional
                    </label>
                    <select
                      value={profesionalId}
                      onChange={(e) => handleProfesionalChange(e.target.value)}
                      disabled={!especialidadId || cargandoProfesionales}
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:text-slate-500"
                    >
                      <option value="" disabled>
                        {cargandoProfesionales
                          ? "Cargando profesionales..."
                          : "Seleccioná un profesional"}
                      </option>
                      {profesionales.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {profesionalInfo && (
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      <span>📍</span> {profesionalInfo.info}
                    </p>
                  )}
                </div>
              </section>

              {/* Paso 2: fecha */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-white font-semibold">Elegir la fecha</h2>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    disabled={esMesActual}
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                      )
                    }
                    className="text-slate-400 disabled:text-slate-700 hover:text-white px-2"
                  >
                    ‹
                  </button>
                  <span className="text-slate-200 text-sm font-medium">
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                      )
                    }
                    className="text-slate-400 hover:text-white px-2"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-2">
                  {DIAS_SEMANA.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {weeks.flat().map((dia, i) => {
                    if (dia === null) {
                      return <div key={i} className="aspect-square" />;
                    }
                    const candidata = new Date(
                      viewDate.getFullYear(),
                      viewDate.getMonth(),
                      dia
                    );
                    const esPasado = candidata < today;
                    const esSeleccionado =
                      fecha && toISO(fecha) === toISO(candidata);

                    return (
                      <button
                        type="button"
                        key={i}
                        disabled={esPasado || !profesionalId}
                        onClick={() => handleSeleccionarDia(dia)}
                        className={
                          "aspect-square flex items-center justify-center rounded-lg text-sm transition " +
                          (esSeleccionado
                            ? "bg-cyan-500 text-slate-950 font-semibold"
                            : esPasado || !profesionalId
                            ? "text-slate-700 cursor-not-allowed"
                            : "text-slate-300 border border-transparent hover:border-cyan-500/60")
                        }
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Columna derecha: horario + resumen */}
            <div className="space-y-6">
              {/* Paso 3: horario */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-white font-semibold">
                    Elegir el horario
                  </h2>
                </div>

                {!fecha ? (
                  <p className="text-slate-500 text-sm">
                    Seleccioná una fecha primero
                  </p>
                ) : cargandoHorarios ? (
                  <p className="text-slate-500 text-sm">
                    Cargando horarios disponibles...
                  </p>
                ) : !hayHorariosDisponibles ? (
                  <p className="text-amber-400 text-sm">
                    No hay horarios disponibles.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {horarios.map((h) => {
                      const seleccionado = hora === h.hora;
                      return (
                        <button
                          type="button"
                          key={h.hora}
                          disabled={h.ocupado}
                          onClick={() => handleSeleccionarHora(h)}
                          className={
                            "text-center text-xs rounded-lg border py-2 transition " +
                            (seleccionado
                              ? "bg-cyan-500 border-cyan-500 text-slate-950 font-semibold"
                              : h.ocupado
                              ? "border-slate-800 text-slate-600 line-through cursor-not-allowed"
                              : "border-slate-700 text-slate-300 hover:border-cyan-500/60")
                          }
                        >
                          {h.hora}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Resumen del turno */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">
                  Resumen del turno
                </h2>

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Especialidad</dt>
                    <dd className={especialidadNombre ? "text-white" : "text-slate-500"}>
                      {especialidadNombre || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Profesional</dt>
                    <dd className={profesionalInfo ? "text-white" : "text-slate-500"}>
                      {profesionalInfo?.nombre || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Fecha</dt>
                    <dd className={fecha ? "text-white" : "text-slate-500"}>
                      {fecha ? fecha.toLocaleDateString("es-AR") : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Hora</dt>
                    <dd className={hora ? "text-white" : "text-slate-500"}>
                      {hora || "—"}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={confirmando}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-slate-950 font-semibold rounded-lg py-3 mt-5 transition"
                >
                  {confirmando ? "Confirmando..." : "Confirmar turno"}
                </button>

                {errorMsg && (
                  <p className="text-red-400 text-sm mt-3">{errorMsg}</p>
                )}
                {successMsg && (
                  <p className="text-emerald-400 text-sm mt-3">{successMsg}</p>
                )}
              </section>
            </div>
          </div>
        </main>
    </PatientShell>
  );
}
