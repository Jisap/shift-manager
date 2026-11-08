import { z } from "zod";

/**
 * Validación del perfil y la configuración regional.
 *
 * Módulo puro compartido por el formulario de React y las funciones de Convex,
 * para que el backend no dependa de la validación del cliente.
 */

export const DEFAULT_TIMEZONE = "Europe/Madrid";
export const DEFAULT_LOCALE = "es-ES";
export const MAX_PROFILE_NAME_LENGTH = 80;

/** Comprueba que el identificador sea una zona horaria IANA válida. */
export function isValidTimezone(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

/** Devuelve la zona horaria recibida si es válida; si no, la de por defecto. */
export function normalizeTimezone(value: string | undefined): string {
  return value !== undefined && isValidTimezone(value)
    ? value
    : DEFAULT_TIMEZONE;
}

/** Schema Zod del formulario de perfil. */
export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .max(
      MAX_PROFILE_NAME_LENGTH,
      `Máximo ${MAX_PROFILE_NAME_LENGTH} caracteres`,
    ),
  timezone: z
    .string()
    .refine(isValidTimezone, "Selecciona una zona horaria válida"),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Perfil visible en la interfaz. */
export interface UserProfile {
  name: string;
  email: string;
  timezone: string;
  locale: string;
}

/** Valores iniciales del formulario de perfil. */
export function defaultProfileValues(): ProfileFormValues {
  return {
    name: "",
    timezone: DEFAULT_TIMEZONE,
  };
}

/**
 * Valida los datos de perfil y devuelve un mensaje de error, o `null` si son
 * correctos. El backend usa esta misma validación.
 */
export function validateProfileInput(input: ProfileFormValues): string | null {
  const result = profileFormSchema.safeParse(input);
  if (result.success) {
    return null;
  }
  return (
    result.error.issues[0]?.message ?? "Los datos del perfil no son válidos"
  );
}
