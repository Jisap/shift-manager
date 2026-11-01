/**
 * Helpers de fechas locales compartidos entre el frontend y el backend (Convex).
 *
 * Trabajan siempre con strings `YYYY-MM-DD` (LocalDate) y `HH:mm` (LocalTime)
 * sin dependencias externas, para poder ejecutarse tanto en Node como en el runtime
 * de Convex sin restricciones de módulo.
 */

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Parsea un string `YYYY-MM-DD` a Date anclado en UTC a las 12:00,
 * evitando desvíos de día por diferencias de zona horaria.
 */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Formatea un Date a string `YYYY-MM-DD` usando sus componentes UTC.
 */
export function formatLocalDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

/**
 * Suma o resta un número entero de días a un string `YYYY-MM-DD`.
 */
export function addLocalDays(date: string, days: number): string {
  const parsed = parseLocalDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatLocalDate(parsed);
}

/**
 * Diferencia en días enteros entre dos fechas locales (`to - from`).
 * Positivo si `to` es posterior; negativo si es anterior.
 */
export function daysBetweenLocal(from: string, to: string): number {
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

/**
 * Día de la semana de un string `YYYY-MM-DD` según la convención JS:
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado.
 */
export function weekdayOf(date: string): number {
  return parseLocalDate(date).getUTCDay();
}

/**
 * Valida que un string tenga formato `YYYY-MM-DD` y represente una fecha real
 * (comprueba que mes y día sean coherentes con el calendario gregoriano).
 */
export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return formatLocalDate(new Date(Date.UTC(year, month - 1, day))) === value;
}

/**
 * Valida que un string tenga formato `HH:mm` con hora 00-23 y minutos 00-59.
 */
export function isValidLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

/**
 * Determina si dos periodos de fecha se solapan.
 * Un extremo `undefined` se interpreta como infinito (`9999-12-31`).
 * Periodos con `end < start` se consideran inválidos y no solapan.
 */
export function rangesOverlap(
  firstStart: string,
  firstEnd: string | undefined,
  secondStart: string,
  secondEnd: string | undefined,
): boolean {
  const firstEndDate = firstEnd ?? "9999-12-31";
  const secondEndDate = secondEnd ?? "9999-12-31";
  if (firstEndDate < firstStart || secondEndDate < secondStart) {
    return false;
  }
  return firstStart <= secondEndDate && secondStart <= firstEndDate;
}

/**
 * Devuelve la fecha local de hoy (`YYYY-MM-DD`) en la zona horaria indicada,
 * usando la API Intl para respetar correctamente el cambio de día local.
 */
export function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
