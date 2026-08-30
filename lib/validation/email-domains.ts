/**
 * Dominios de correo frecuentes usados solo para SUGERIR mientras el
 * usuario escribe. No limitan qué dominios son válidos: cualquier
 * dominio con formato correcto es aceptado por `isValidEmail`.
 */
export const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
] as const;

/**
 * Dado el valor actual del campo email, devuelve hasta `limit` sugerencias
 * de dominio para autocompletar (ej: "juan@gm" -> "juan@gmail.com").
 * Devuelve [] si todavía no se escribió el "@" o si el dominio ya está
 * completo / no matchea ningún dominio frecuente.
 */
export function getEmailDomainSuggestions(
  value: string,
  limit = 4
): string[] {
  const atIndex = value.indexOf("@");
  if (atIndex === -1 || atIndex === value.length - 1) {
    return [];
  }

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex + 1).toLowerCase();

  if (!localPart || !domainPart) {
    return [];
  }

  const matches = COMMON_EMAIL_DOMAINS.filter(
    (domain) => domain.startsWith(domainPart) && domain !== domainPart
  );

  return matches.slice(0, limit).map((domain) => `${localPart}@${domain}`);
}
