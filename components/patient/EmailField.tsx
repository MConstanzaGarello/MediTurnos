"use client";

import { useId, useState } from "react";
import FormField from "@/components/patient/FormField";
import { getEmailDomainSuggestions } from "@/lib/validation/email-domains";

interface EmailFieldProps {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/**
 * Campo de email con sugerencias de dominios frecuentes (gmail, hotmail,
 * outlook, yahoo, icloud). Las sugerencias son solo de UX: cualquier
 * dominio con formato válido es aceptado igual.
 */
export default function EmailField({
  value,
  error,
  onChange,
  onBlur,
}: EmailFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const listboxId = useId();

  const suggestions = getEmailDomainSuggestions(value);
  const visible = showSuggestions && suggestions.length > 0;

  return (
    <div className="relative">
      <FormField
        type="email"
        name="email"
        label="Correo electrónico"
        placeholder="nombre@ejemplo.com"
        autoComplete="email"
        value={value}
        error={error}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onBlur={() => {
          // Pequeño delay para permitir el click en una sugerencia antes
          // de cerrar la lista.
          window.setTimeout(() => setShowSuggestions(false), 120);
          onBlur();
        }}
        onFocus={() => setShowSuggestions(true)}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {visible && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sugerencias de dominio de correo"
          className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 focus:bg-slate-700 outline-none"
                onMouseDown={(e) => {
                  // onMouseDown para que dispare antes del onBlur del input.
                  e.preventDefault();
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
