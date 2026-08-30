"use client";

import { forwardRef } from "react";

interface FormFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string | null;
  hint?: string;
}

/**
 * Input reutilizable con label asociado (accesibilidad), estado de error
 * (borde rojo + mensaje debajo) y hint opcional. Usado por todos los
 * campos del formulario de registro.
 */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, id, name, required = true, ...inputProps }, ref) => {
    const fieldId = id ?? name;
    const errorId = fieldId ? `${fieldId}-error` : undefined;
    const hintId = fieldId ? `${fieldId}-hint` : undefined;

    return (
      <div>
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          {label}
          {required && <span className="text-cyan-400 ml-0.5">*</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          name={name}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`w-full rounded-lg bg-slate-800/80 border px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:ring-2 focus:ring-offset-0 ${
            error
              ? "border-red-500 focus:ring-red-500/40"
              : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
          }`}
          {...inputProps}
        />
        {hint && !error && (
          <p id={hintId} className="text-slate-500 text-xs mt-1.5">
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-red-400 text-sm mt-1.5 flex items-start gap-1"
          >
            <span aria-hidden="true">⚠</span>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
