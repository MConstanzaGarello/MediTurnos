"use client";

// Estructura común de las pantallas del paciente: menú lateral (menú
// principal) + barra superior con el nombre y "Salir".
// Se extrajo de la pantalla de HU-03 para que "Nuevo Turno" y "Mis
// Turnos" (HU-04) compartan el mismo menú y se pueda navegar entre ellas.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { SessionPatient } from "@/lib/auth/session";

interface NavItem {
  label: string;
  /** Sin href = opción todavía no implementada (se muestra deshabilitada). */
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio" },
  { label: "Nuevo Turno", href: "/turnos/nuevo" },
  { label: "Mis Turnos", href: "/turnos/mis-turnos" },
  { label: "Historial", href: "/turnos/historial" }, // HU-07
  { label: "Mi Perfil" },
];

interface PatientShellProps {
  paciente: SessionPatient;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function PatientShell({ paciente, onCerrarSesion, children }: PatientShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar (menú principal) */}
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <span className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M11 2v2" />
              <path d="M5 2v2" />
              <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
              <path d="M8 15a6 6 0 0 0 12 0v-3" />
              <circle cx="20" cy="10" r="2" />
            </svg>
          </span>
          <span className="text-white font-semibold tracking-wide text-sm">
            MEDITURNOS
          </span>
        </div>

        <nav aria-label="Menú principal" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const activo = item.href !== undefined && pathname === item.href;
            const clases =
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm " +
              (activo
                ? "bg-cyan-500 text-slate-950 font-semibold"
                : item.href
                ? "text-slate-300 hover:bg-slate-800"
                : "text-slate-600 cursor-default");
            const punto = (
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " + (activo ? "bg-slate-950" : "bg-slate-600")
                }
              />
            );

            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={clases}
              >
                {punto}
                {item.label}
              </Link>
            ) : (
              <div key={item.label} className={clases} aria-disabled="true">
                {punto}
                {item.label}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-end px-8 gap-4">
          <span className="text-slate-400 text-lg">🔔</span>
          <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">
            👤
          </span>
          <span className="text-slate-300 text-sm">{paciente.nombre}</span>
          <button
            type="button"
            onClick={onCerrarSesion}
            className="text-slate-500 hover:text-red-400 text-xs transition"
          >
            Salir
          </button>
        </header>

        {children}
      </div>
    </div>
  );
}
