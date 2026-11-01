import { TZDate } from "@date-fns/tz";
import type { LocalDate, LocalTime, PatternDefinition } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Convierte una fecha en formato local `YYYY-MM-DD` a una instancia Date en UTC a mediodía (12:00 UTC).
 * Usar las 12:00 evita desvíos de día por pequeñas diferencias de zona horaria al manipular días.
 */
export function parseLocalDate(date: LocalDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Formatea un objeto Date a string de fecha local `YYYY-MM-DD` tomando sus componentes UTC.
 */
export function formatLocalDate(date: Date): LocalDate {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

/**
 * Suma o resta un número entero de días a una fecha local `YYYY-MM-DD`,
 * devolviendo la nueva fecha resultante en el mismo formato.
 */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const parsed = parseLocalDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatLocalDate(parsed);
}

/**
 * Calcula la diferencia en días enteros entre dos fechas locales (`to - from`).
 * Retorna valores positivos si `to` es posterior a `from`, o negativos si es anterior.
 */
export function daysBetweenLocal(from: LocalDate, to: LocalDate): number {
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

/**
 * Obtiene el día de la semana para una fecha local según la convención JS:
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado.
 */
export function weekdayOf(date: LocalDate): number {
  return parseLocalDate(date).getUTCDay();
}

/**
 * Operación módulo euclídeo siempre positivo (a diferencia del operador `%` nativo de JS
 * que devuelve valores negativos para dividendos negativos).
 */
export function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * Genera un arreglo ordenado con todas las fechas locales `YYYY-MM-DD` comprendidas
 * entre `startDate` y `endDate` (ambas inclusive). Si el rango es inverso, retorna `[]`.
 */
export function enumerateLocalDates(
  startDate: LocalDate,
  endDate: LocalDate,
): LocalDate[] {
  const days = daysBetweenLocal(startDate, endDate);
  if (days < 0) {
    return [];
  }
  return Array.from({ length: days + 1 }, (_, index) =>
    addLocalDays(startDate, index),
  );
}

/**
 * Convierte una fecha local (`YYYY-MM-DD`) y hora (`HH:mm`) en una zona horaria dada
 * a un instante absoluto en milisegundos UTC (epoch ms), respetando cambios de horario (DST).
 * Permite desplazar días adicionales con `dayOffset` (útil para turnos que cruzan medianoche).
 */
export function localDateTimeToInstant(
  date: LocalDate,
  time: LocalTime,
  timezone: string,
  dayOffset = 0,
): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new TZDate(
    year,
    month - 1,
    day + dayOffset,
    hours,
    minutes,
    0,
    0,
    timezone,
  ).getTime();
}

/**
 * Comprueba si la fecha dada cae dentro del periodo de vigencia del patrón
 * (`startDate <= date <= endDate`).
 */
export function patternCovers(
  pattern: PatternDefinition,
  date: LocalDate,
): boolean {
  if (pattern.startDate > date) {
    return false;
  }
  if (pattern.endDate !== undefined && pattern.endDate < date) {
    return false;
  }
  return true;
}

/**
 * Calcula el índice del día dentro del ciclo del patrón para una fecha determinada:
 * - Para patrones semanales: mapea lunes = 0 ... domingo = 6.
 * - Para patrones rotativos: calcula la distancia en días respecto a `anchorDate`
 *   y aplica módulo `cycleLength`.
 */
export function dayIndexFor(
  pattern: PatternDefinition,
  date: LocalDate,
): number {
  if (pattern.cycleLength <= 0) {
    throw new Error(`El patrón ${pattern.id} tiene cycleLength inválido`);
  }
  if (pattern.type === "weekly") {
    return modulo(weekdayOf(date) + 6, 7);
  }
  return modulo(
    daysBetweenLocal(pattern.anchorDate, date),
    pattern.cycleLength,
  );
}
