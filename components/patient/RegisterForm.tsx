"use client";

import { useState } from "react";
import FormField from "@/components/patient/FormField";
import EmailField from "@/components/patient/EmailField";
import PasswordRequirements from "@/components/patient/PasswordRequirements";
import {
  emptyPatientForm,
  type PatientRegisterErrors,
  type PatientRegisterField,
  type PatientRegisterFormData,
} from "@/lib/types/patient";
import { validateField, validatePatientForm } from "@/lib/validation/patient";
import {
  PatientRegisterError,
  registerPatient,
} from "@/lib/services/patientService";

const todayIsoDate = new Date().toISOString().split("T")[0];

/**
 * Formulario de registro de paciente (HU-01), de punta a punta:
 * valida en el cliente, envía al backend real y refleja los errores
 * que el backend detecte (incluyendo DNI/email duplicados).
 */
export default function RegisterForm() {
  const [form, setForm] = useState<PatientRegisterFormData>(emptyPatientForm);
  const [errors, setErrors] = useState<PatientRegisterErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<PatientRegisterField, boolean>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  const setFieldValue = (field: PatientRegisterField, value: string) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    // Si el campo ya mostraba un error, lo revalidamos al tipear para que
    // desaparezca apenas se corrija (como pide la consigna).
    setErrors((prevErrors) => {
      const nextErrors = { ...prevErrors };

      if (prevErrors[field]) {
        const fieldError = validateField(field, value, nextForm);
        if (fieldError) {
          nextErrors[field] = fieldError;
        } else {
          delete nextErrors[field];
        }
      }

      // La confirmación de contraseña depende de password: si cambia una,
      // revalidamos la otra para que "no coinciden" se actualice al toque.
      if (
        field === "password" &&
        (touched.confirmarPassword || prevErrors.confirmarPassword)
      ) {
        const confirmError = validateField(
          "confirmarPassword",
          nextForm.confirmarPassword,
          nextForm
        );
        if (confirmError) {
          nextErrors.confirmarPassword = confirmError;
        } else {
          delete nextErrors.confirmarPassword;
        }
      }

      return nextErrors;
    });
  };

  const handleBlur = (field: PatientRegisterField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field], form);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const inputHandlers = (field: PatientRegisterField) => ({
    name: field,
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFieldValue(field, e.target.value),
    onBlur: () => handleBlur(field),
    error: touched[field] ? errors[field] : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const formErrors = validatePatientForm(form);
    setErrors(formErrors);
    setTouched({
      nombre: true,
      apellido: true,
      dni: true,
      fechaNacimiento: true,
      email: true,
      telefono: true,
      password: true,
      confirmarPassword: true,
    });

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const patient = await registerPatient(form);
      setRegisteredName(`${patient.nombre} ${patient.apellido}`);
    } catch (error) {
      if (error instanceof PatientRegisterError) {
        if (error.status === 409 || error.status === 400) {
          if (error.errors && Object.keys(error.errors).length > 0) {
            setErrors((prev) => ({ ...prev, ...error.errors }));
            setTouched((prev) => ({
              ...prev,
              ...Object.fromEntries(
                Object.keys(error.errors ?? {}).map((key) => [key, true])
              ),
            }));
          } else {
            setSubmitError(error.message);
          }
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError(
          "Ocurrió un error inesperado. Intentá nuevamente en unos minutos."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredName) {
    return (
      <div
        className="bg-slate-900 border border-emerald-800/50 rounded-2xl p-8 shadow-2xl text-center"
        role="status"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          ¡Registro exitoso!
        </h2>
        <p className="text-slate-400 text-sm">
          {registeredName}, tu cuenta fue creada correctamente. Ya podés
          iniciar sesión para solicitar turnos médicos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-2">Crear cuenta</h2>
      <p className="text-slate-400 text-sm mb-6">
        Registrate para poder solicitar turnos médicos.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            type="text"
            label="Nombre"
            placeholder="Ej: María"
            autoComplete="given-name"
            {...inputHandlers("nombre")}
          />
          <FormField
            type="text"
            label="Apellido"
            placeholder="Ej: González"
            autoComplete="family-name"
            {...inputHandlers("apellido")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            type="text"
            inputMode="numeric"
            label="DNI"
            placeholder="Ej: 30123456"
            autoComplete="off"
            maxLength={8}
            hint="Sin puntos, entre 7 y 8 dígitos."
            {...inputHandlers("dni")}
          />
          <FormField
            type="date"
            label="Fecha de nacimiento"
            autoComplete="bday"
            max={todayIsoDate}
            {...inputHandlers("fechaNacimiento")}
          />
        </div>

        <EmailField
          value={form.email}
          error={touched.email ? errors.email : undefined}
          onChange={(value) => setFieldValue("email", value)}
          onBlur={() => handleBlur("email")}
        />

        <FormField
          type="tel"
          label="Teléfono"
          placeholder="Ej: 011 3456-7890"
          autoComplete="tel"
          hint="Podés incluir código de área, espacios o guiones."
          {...inputHandlers("telefono")}
        />

        <div>
          <FormField
            type="password"
            label="Contraseña"
            placeholder="Creá una contraseña segura"
            autoComplete="new-password"
            {...inputHandlers("password")}
          />
          <PasswordRequirements password={form.password} />
        </div>

        <FormField
          type="password"
          label="Confirmar contraseña"
          placeholder="Repetí tu contraseña"
          autoComplete="new-password"
          {...inputHandlers("confirmarPassword")}
        />

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-3 mt-2 transition flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
              aria-hidden="true"
            />
          )}
          {isSubmitting ? "Registrando..." : "Registrarme"}
        </button>
      </form>
    </div>
  );
}
