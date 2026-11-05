import type { AltaMedicoErrors, AltaMedicoForm } from "@/lib/types/admin";

/** Dominio obligatorio del correo de un médico (HU-11). */
export const DOMINIO_EMAIL_MEDICO = "@mediturnos.com";

export const formVacio: AltaMedicoForm = {
  nombre: "",
  apellido: "",
  matricula: "",
  email: "",
  especialidadId: "",
  precioParticular: "",
  passwordTemporal: "",
  info: "",
  obrasSocialesIds: [],
};

const NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const OBLIGATORIO = "Este campo es obligatorio.";

/**
 * Validación del formulario de alta (HU-11). Replica las reglas del backend
 * para avisar antes de enviar; el servidor las vuelve a validar.
 */
export function validarAltaMedico(f: AltaMedicoForm): AltaMedicoErrors {
  const e: AltaMedicoErrors = {};

  for (const campo of ["nombre", "apellido"] as const) {
    const v = f[campo].trim();
    if (!v) e[campo] = OBLIGATORIO;
    else if (v.length > 50 || !NOMBRE.test(v)) e[campo] = "Solo puede contener letras (hasta 50 caracteres).";
  }

  const matricula = f.matricula.trim();
  if (!matricula) e.matricula = OBLIGATORIO;
  else if (!/^\d{3,10}$/.test(matricula)) e.matricula = "La matrícula debe tener entre 3 y 10 números.";

  const email = f.email.trim().toLowerCase();
  if (!email) e.email = OBLIGATORIO;
  else if (!new RegExp(`^[a-z0-9]+(?:[._-][a-z0-9]+)*${DOMINIO_EMAIL_MEDICO.replace(".", "\\.")}$`).test(email)) {
    e.email = `El correo debe ser del tipo nombre${DOMINIO_EMAIL_MEDICO} (ej: romanperez${DOMINIO_EMAIL_MEDICO}).`;
  }

  if (!f.especialidadId) e.especialidadId = OBLIGATORIO;

  const precioTexto = f.precioParticular.trim().replace(",", ".");
  const precio = Number(precioTexto);
  if (!precioTexto) e.precioParticular = OBLIGATORIO;
  else if (!Number.isFinite(precio) || precio <= 0) e.precioParticular = "El precio debe ser un número mayor a 0.";
  else if (precio > 9_999_999.99 || Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6) {
    e.precioParticular = "El precio no es válido (máximo 2 decimales).";
  }

  const pass = f.passwordTemporal;
  if (!pass) e.passwordTemporal = OBLIGATORIO;
  else if (pass.length < 8 || pass.length > 72 || !/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    e.passwordTemporal = "La contraseña temporal debe tener al menos 8 caracteres, con letras y números.";
  }

  if (f.info.trim().length > 255) e.info = "Los horarios no pueden superar los 255 caracteres.";

  return e;
}

/** Formatea un precio como pesos argentinos: 25000 -> "$ 25.000". */
export function formatearPrecio(precio: number | null): string {
  if (precio === null) return "—";
  return `$ ${precio.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}
