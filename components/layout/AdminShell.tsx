"use client";

// Estructura común de las pantallas del administrador (HU-11 / HU-12):
// menú lateral + barra superior con el nombre y "Salir". Mismo estilo que
// PatientShell.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { SessionPatient } from "@/lib/auth/session";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Médicos", href: "/admin/medicos" },
  { label: "Reportes", href: "/admin/reportes" },
];

interface AdminShellProps {
  admin: SessionPatient;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function AdminShell({ admin, onCerrarSesion, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <span className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 text-xs font-bold">
            M
          </span>
          <span className="text-white font-semibold tracking-wide text-sm">MEDITURNOS</span>
        </div>

        <nav aria-label="Menú del administrador" className="flex-1 px-3 py-4 space-y-1">
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
                  className={"w-1.5 h-1.5 rounded-full " + (activo ? "bg-slate-950" : "bg-slate-600")}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-end px-8 gap-4">
          <span className="rounded-full border border-cyan-500/40 px-3 py-1 text-xs font-semibold text-cyan-400">
            ADMIN
          </span>
          <span className="text-slate-300 text-sm">{admin.nombre}</span>
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
