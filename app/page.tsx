"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    email: "",
    telefono: "",
    password: "",
    confirmarPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.nombre ||
      !form.apellido ||
      !form.dni ||
      !form.fechaNacimiento ||
      !form.email ||
      !form.telefono ||
      !form.password ||
      !form.confirmarPassword
    ) {
      alert("Por favor, completá todos los campos.");
      return;
    }

    if (form.password !== form.confirmarPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    alert("Registro válido.");
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">MediTurnos</h1>

          <p className="text-slate-400 mt-2">
            Gestión de turnos médicos
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Crear cuenta
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            Registrate para poder solicitar turnos médicos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ingresá tu nombre"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                placeholder="Ingresá tu apellido"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                DNI
              </label>
              <input
                type="text"
                name="dni"
                value={form.dni}
                onChange={handleChange}
                placeholder="Ingresá tu DNI"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                name="fechaNacimiento"
                value={form.fechaNacimiento}
                onChange={handleChange}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Ingresá tu email"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Ingresá tu teléfono"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Ingresá una contraseña"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                name="confirmarPassword"
                value={form.confirmarPassword}
                onChange={handleChange}
                placeholder="Repetí tu contraseña"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg py-3 mt-2 transition"
            >
              Registrarme
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}