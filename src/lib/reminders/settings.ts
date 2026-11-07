/**
 * Ajustes de recordatorios compartidos entre Convex y el frontend.
 *
 * Módulo puro y sin dependencias externas para poder importarse tanto desde
 * las funciones de Convex como desde los componentes de React.
 *
 * Alcance del MVP: las notificaciones se programan en el cliente y solo se
 * muestran mientras la aplicación esté abierta. No hay servidor de push.
 */

export interface ReminderSettings {
  /** Interruptor general de recordatorios. */
  enabled: boolean;
  /** Minutos de antelación con los que avisar del próximo turno. */
  leadMinutes: number;
  /** Avisar cuando cambia el próximo turno mientras la app está abierta. */
  notifyChanges: boolean;
}

/** Ajustes por defecto: desactivados hasta que el usuario conceda permiso. */
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  leadMinutes: 30,
  notifyChanges: true,
};

export const MIN_LEAD_MINUTES = 0;
export const MAX_LEAD_MINUTES = 1440;

/** Comprueba que la antelación sea un entero dentro del rango admitido. */
export function isValidLeadMinutes(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_LEAD_MINUTES &&
    value <= MAX_LEAD_MINUTES
  );
}

/**
 * Valida los ajustes y devuelve un mensaje de error, o `null` si son válidos.
 * El backend usa esta misma validación para no confiar en el cliente.
 */
export function validateReminderSettings(
  settings: ReminderSettings,
): string | null {
  if (!isValidLeadMinutes(settings.leadMinutes)) {
    return `La antelación debe ser un entero entre ${MIN_LEAD_MINUTES} y ${MAX_LEAD_MINUTES} minutos`;
  }
  if (typeof settings.enabled !== "boolean") {
    return "El interruptor de recordatorios no es válido";
  }
  if (typeof settings.notifyChanges !== "boolean") {
    return "La opción de avisar de cambios no es válida";
  }
  return null;
}
