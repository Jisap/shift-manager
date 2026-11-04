/**
 * Agregaciones de estadísticas a partir de los días resueltos por el motor.
 *
 * Funciones puras y sin acceso a Convex: reciben los datos ya cargados por las
 * queries y devuelven totales, desglose por categoría y series agrupadas para
 * los gráficos. Las horas se manejan siempre en minutos.
 */

import { addLocalDays, daysBetweenLocal, weekdayOf } from "../dates/local-date";
import type { ResolvedDay } from "../engine";
import {
  classifyDayMinutes,
  emptyClassifiedMinutes,
  sumClassifiedMinutes,
  type ClassifiedMinutes,
} from "./classification";

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const DAYS_PER_WEEK = 7;
const MAX_DAYS_FOR_DAILY_BUCKETS = 31;
const MAX_DAYS_FOR_WEEKLY_BUCKETS = 120;

/** Registro de horas necesarias para las estadísticas. */
export interface StatisticsTimeEntry {
  date: string;
  actualStart?: number;
  actualEnd?: number;
  breakMinutes: number;
  overtimeMinutes?: number;
}

export interface StatisticsInput {
  days: ResolvedDay[];
  timeEntries: StatisticsTimeEntry[];
  /** Fechas con al menos un festivo. */
  holidayDates: ReadonlySet<string>;
  /** Fechas con una excepción de tipo `extra`. */
  extraDates: ReadonlySet<string>;
}

export interface StatisticsDay extends ClassifiedMinutes {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  differenceMinutes: number;
  isHoliday: boolean;
  isExtraDay: boolean;
  isShift: boolean;
}

export interface StatisticsSummary {
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  differenceMinutes: number;
  classified: ClassifiedMinutes;
  shiftDays: number;
  restDays: number;
  holidayDays: number;
  recordedDays: number;
  days: StatisticsDay[];
}

export type StatisticsBucketSize = "day" | "week" | "month";

export interface StatisticsBucket {
  key: string;
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  differenceMinutes: number;
}

/** Minutos reales de un registro: (fin - inicio) menos la pausa. */
export function actualMinutesOfEntry(entry: StatisticsTimeEntry): number {
  if (entry.actualStart === undefined || entry.actualEnd === undefined) {
    return 0;
  }
  return Math.max(
    0,
    Math.round(
      (entry.actualEnd - entry.actualStart) / MILLISECONDS_PER_MINUTE,
    ) - entry.breakMinutes,
  );
}

/**
 * Construye el resumen del periodo. Los registros de horas se asocian por
 * fecha; los días sin registro cuentan con 0 minutos reales.
 */
export function buildStatistics(input: StatisticsInput): StatisticsSummary {
  const entriesByDate = new Map(
    input.timeEntries.map((entry) => [entry.date, entry]),
  );

  const days: StatisticsDay[] = input.days.map((day) => {
    const entry = entriesByDate.get(day.date);
    const actualMinutes = entry === undefined ? 0 : actualMinutesOfEntry(entry);
    const overtimeMinutes = entry?.overtimeMinutes ?? 0;
    const isHoliday = input.holidayDates.has(day.date);
    const isExtraDay = input.extraDates.has(day.date);
    const classified = classifyDayMinutes({
      actualMinutes,
      overtimeMinutes,
      isHoliday,
      isExtraDay,
    });

    return {
      date: day.date,
      plannedMinutes: day.plannedMinutes,
      actualMinutes,
      overtimeMinutes,
      differenceMinutes: actualMinutes - day.plannedMinutes,
      isHoliday,
      isExtraDay,
      isShift: day.kind === "shift",
      ...classified,
    };
  });

  const plannedMinutes = days.reduce(
    (total, day) => total + day.plannedMinutes,
    0,
  );
  const actualMinutes = days.reduce(
    (total, day) => total + day.actualMinutes,
    0,
  );
  const overtimeMinutes = days.reduce(
    (total, day) => total + day.overtimeMinutes,
    0,
  );

  return {
    plannedMinutes,
    actualMinutes,
    overtimeMinutes,
    differenceMinutes: actualMinutes - plannedMinutes,
    classified: sumClassifiedMinutes(days.map((day) => day)),
    shiftDays: days.filter((day) => day.isShift).length,
    restDays: days.filter((day) => !day.isShift).length,
    holidayDays: days.filter((day) => day.isHoliday).length,
    recordedDays: days.filter((day) => day.actualMinutes > 0).length,
    days,
  };
}

/**
 * Elige la agrupación del gráfico según la duración del periodo: días para
 * periodos cortos, semanas para medios y meses para periodos largos.
 */
export function statisticsBucketSize(
  startDate: string,
  endDate: string,
): StatisticsBucketSize {
  const totalDays = daysBetweenLocal(startDate, endDate) + 1;
  if (totalDays <= MAX_DAYS_FOR_DAILY_BUCKETS) {
    return "day";
  }
  if (totalDays <= MAX_DAYS_FOR_WEEKLY_BUCKETS) {
    return "week";
  }
  return "month";
}

/** Lunes de la semana a la que pertenece una fecha local. */
function startOfLocalWeek(date: string): string {
  const weekday = weekdayOf(date);
  const offset = (weekday + 6) % DAYS_PER_WEEK;
  return addLocalDays(date, -offset);
}

function bucketKey(date: string, size: StatisticsBucketSize): string {
  if (size === "month") {
    return date.slice(0, 7);
  }
  if (size === "week") {
    return startOfLocalWeek(date);
  }
  return date;
}

/** Agrupa los días del resumen en la unidad indicada, ordenados por clave. */
export function bucketStatistics(
  days: StatisticsDay[],
  size: StatisticsBucketSize,
): StatisticsBucket[] {
  const buckets = new Map<string, StatisticsBucket>();

  for (const day of days) {
    const key = bucketKey(day.date, size);
    const bucket = buckets.get(key) ?? {
      key,
      plannedMinutes: 0,
      actualMinutes: 0,
      overtimeMinutes: 0,
      differenceMinutes: 0,
    };
    bucket.plannedMinutes += day.plannedMinutes;
    bucket.actualMinutes += day.actualMinutes;
    bucket.overtimeMinutes += day.overtimeMinutes;
    bucket.differenceMinutes += day.differenceMinutes;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

/** Resumen vacío, útil para estados de carga sin datos. */
export function emptyStatisticsSummary(): StatisticsSummary {
  return {
    plannedMinutes: 0,
    actualMinutes: 0,
    overtimeMinutes: 0,
    differenceMinutes: 0,
    classified: emptyClassifiedMinutes(),
    shiftDays: 0,
    restDays: 0,
    holidayDays: 0,
    recordedDays: 0,
    days: [],
  };
}
