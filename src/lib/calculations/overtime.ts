import { localDateTimeToInstant } from "@/lib/engine";
import type { ShiftInterval } from "@/lib/engine";

const MINUTES_PER_DAY = 24 * 60;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

/** Convierte minutos en texto legible: `"2 h"`, `"1 h 30 min"`. */
export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * Duración local de un tramo en minutos. Si la hora de fin es anterior o igual
 * a la de inicio, se interpreta que cruza medianoche.
 */
export function localIntervalMinutes(interval: ShiftInterval): number {
  if (!interval.start || !interval.end || interval.start === interval.end) {
    return 0;
  }
  const [startHour, startMinute] = interval.start.split(":").map(Number);
  const [endHour, endMinute] = interval.end.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) {
    end += MINUTES_PER_DAY;
  }
  return end - start;
}

/**
 * Calcula los minutos reales de un conjunto de tramos en una zona horaria,
 * respetando los cambios de horario (DST).
 */
export function overtimeMinutesForIntervals(
  date: string,
  intervals: ShiftInterval[],
  timezone: string,
): number {
  const total = intervals.reduce((sum, interval) => {
    const start = localDateTimeToInstant(date, interval.start, timezone);
    let end = localDateTimeToInstant(date, interval.end, timezone);
    if (end <= start) {
      end = localDateTimeToInstant(date, interval.end, timezone, 1);
    }
    return sum + end - start;
  }, 0);
  return Math.round(total / MILLISECONDS_PER_MINUTE);
}

/**
 * Minutos netos trabajados en un tramo real, descontando las pausas.
 * La duración bruta respeta DST al calcularse con instantes absolutos.
 */
export function actualMinutesForInterval(
  date: string,
  start: string,
  end: string,
  breakMinutes: number,
  timezone: string,
): number {
  const gross = overtimeMinutesForIntervals(date, [{ start, end }], timezone);
  const breaks = Number.isFinite(breakMinutes) ? Math.max(0, breakMinutes) : 0;
  return Math.max(0, gross - breaks);
}
