"use client";

import { useState } from "react";
import RegisterForm from "@/components/patient/RegisterForm";
import {
  loginPatient,
  LoginError,
  type AuthenticatedPatient,
} from "@/lib/services/authService";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"login" | "registro">("login");

  // --- HU-02: Inicio de sesión ---
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSubmitError, setLoginSubmitError] = useState<string | null>(
    null
  );
  const [loggedInPatient, setLoggedInPatient] =
    useState<AuthenticatedPatient | null>(null);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setLoginForm({
      ...loginForm,
      [name]: value,
    });

    if (loginErrors[name as "email" | "password"]) {
      setLoginErrors({
        ...loginErrors,
        [name]: undefined,
      });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitError(null);

    const newErrors: { email?: string; password?: string } = {};

    if (!loginForm.email) {
      newErrors.email = "Este campo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      newErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!loginForm.password) {
      newErrors.password = "Este campo es obligatorio.";
    }

    setLoginErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoggingIn(true);
    try {
      const paciente = await loginPatient(
        loginForm.email,
        loginForm.password
      );
      setLoggedInPatient(paciente);
    } catch (error) {
      if (error instanceof LoginError) {
        setLoginSubmitError(error.message);
      } else {
        setLoginSubmitError(
          "Ocurrió un error inesperado. Intentá nuevamente."
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">MediTurnos</h1>
          <p className="text-slate-400 mt-2">Gestión de turnos médicos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

          <div className="flex mb-6 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === "login"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-400"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("registro")}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === "registro"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-400"
              }`}
            >
              Registrarse
            </button>
          </div>

          {activeTab === "login" ? (
            loggedInPatient ? (
              <div className="text-center" role="status">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-2xl">
                  ✓
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  ¡Bienvenido/a, {loggedInPatient.nombre}!
                </h2>
                <p className="text-slate-400 text-sm">
                  Iniciaste sesión correctamente.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Iniciar sesión
                </h2>

                <p className="text-slate-400 text-sm mb-6">
                  Ingresá con tu correo y contraseña para gestionar tus turnos.
                </p>

                <form
                  onSubmit={handleLoginSubmit}
                  className="space-y-4"
                  noValidate
                >
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      placeholder="Ingresá tu correo electrónico"
                      className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                        loginErrors.email
                          ? "border-red-500"
                          : "border-slate-700"
                      }`}
                    />
                    {loginErrors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      placeholder="Ingresá tu contraseña"
                      className={`w-full rounded-lg bg-slate-800 border px-4 py-3 text-white outline-none focus:border-cyan-400 ${
                        loginErrors.password
                          ? "border-red-500"
                          : "border-slate-700"
                      }`}
                    />
                    {loginErrors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {loginSubmitError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                    >
                      {loginSubmitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 mt-2 transition"
                  >
                    {isLoggingIn ? "Ingresando..." : "Ingresar"}
                  </button>
                </form>
              </>
            )
          ) : (
            <RegisterForm />
          )}
        </div>
      </div>
    </main>
  );
}