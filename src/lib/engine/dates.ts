import { TZDate } from "@date-fns/tz";
import { addLocalDays, daysBetweenLocal, weekdayOf } from "../dates/local-date";
import type { LocalDate, LocalTime, PatternDefinition } from "./types";

export {
  addLocalDays,
  daysBetweenLocal,
  formatLocalDate,
  isValidLocalDate,
  isValidLocalTime,
  parseLocalDate,
  rangesOverlap,
  todayInTimezone,
  weekdayOf,
} from "../dates/local-date";

export function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

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
