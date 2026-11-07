"use client";

// Estructura común de las pantallas del Portal del Médico: menú lateral +
// barra superior con el nombre real del médico (de su sesión) y "Salir".
// Mismo estilo que PatientShell para que las dos áreas se vean parte de la
// misma aplicación.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { SessionMedico } from "@/lib/auth/medicoSession";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/medico/inicio" },
  { label: "Mis Pacientes", href: "/medico/pacientes" },
  { label: "Mi Perfil", href: "/medico/perfil" },
];

interface DoctorShellProps {
  medico: SessionMedico;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function DoctorShell({ medico, onCerrarSesion, children }: DoctorShellProps) {
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
          <div className="leading-tight">
            <span className="block text-white font-semibold tracking-wide text-sm">
              MEDITURNOS
            </span>
            <span className="block text-cyan-400 text-[10px] font-semibold tracking-wider">
              PORTAL MÉDICO
            </span>
          </div>
        </div>

        <nav aria-label="Menú principal" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm " +
                  (activo
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:bg-slate-800")
                }
              >
                <span
                  className={
                    "w-1.5 h-1.5 rounded-full " + (activo ? "bg-slate-950" : "bg-slate-600")
                  }
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-end px-8 gap-4">
          <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">
            🩺
          </span>
          <div className="text-right leading-tight">
            <span className="block text-slate-200 text-sm">{medico.nombre}</span>
            {medico.especialidad && (
              <span className="block text-slate-500 text-xs">{medico.especialidad}</span>
            )}
          </div>
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
