"use client";

import {
  PASSWORD_REQUIREMENTS,
  getPasswordRequirementState,
} from "@/lib/validation/patient";

interface PasswordRequirementsProps {
  password: string;
}

/**
 * Checklist en tiempo real de los requisitos de la contraseña.
 * Se actualiza en cada tecla presionada (ver PatientRegisterForm).
 */
export default function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  const state = getPasswordRequirementState(password);

  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" aria-live="polite">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = state[requirement.key];
        return (
          <li
            key={requirement.key}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            <span>{requirement.label}</span>
            <span className="sr-only">
              {met ? "cumplido" : "pendiente"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
