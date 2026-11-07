/**
 * Datos de exportación (CSV y PDF) a partir de los días resueltos por el motor
 * y del resumen de estadísticas.
 *
 * Módulo puro y sin acceso a Convex: recibe los datos ya cargados por las
 * queries y los transforma en filas estables. Las horas se manejan en minutos;
 * el formateo final lo hacen los generadores de CSV y PDF.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type {
  StatisticsDay,
  StatisticsSummary,
} from "../calculations/statistics";
import type { ResolvedDay } from "../engine";

/** Categoría de un día, tal y como aparece en la exportación. */
export interface ExportDayRow {
  date: string;
  weekday: string;
  shift: string;
  intervals: string;
  plannedMinutes: number;
  actualMinutes: number;
  differenceMinutes: number;
  overtimeMinutes: number;
  category: string;
  isHoliday: boolean;
  isExtraDay: boolean;
  isVacation: boolean;
}

export interface ExportSummary {
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  differenceMinutes: number;
  normalMinutes: number;
  extraMinutes: number;
  holidayMinutes: number;
  holidayExtraMinutes: number;
  shiftDays: number;
  restDays: number;
  vacationDays: number;
  recordedDays: number;
}

export interface ExportData {
  startDate: string;
  endDate: string;
  timezone: string;
  /** Instante de generación (epoch ms UTC). */
  generatedAt: number;
  summary: ExportSummary;
  rows: ExportDayRow[];
}

export interface BuildExportDataInput {
  startDate: string;
  endDate: string;
  timezone: string;
  /** Días resueltos por el motor, alineados con `statistics.days`. */
  days: ResolvedDay[];
  statistics: StatisticsSummary;
  /** Nombre de cada tipo de turno indexado por id. */
  shiftNames: ReadonlyMap<string, string>;
  generatedAt?: number;
}

/**
 * Etiqueta de categoría de un día. Las categorías pueden combinarse (por
 * ejemplo, una jornada normal con horas extra); se listan en orden fijo.
 * Devuelve "—" cuando no hay horas clasificadas.
 */
export function categoryLabel(day: StatisticsDay): string {
  const parts: string[] = [];
  if (day.normal > 0) {
    parts.push("Normal");
  }
  if (day.extra > 0) {
    parts.push("Extra");
  }
  if (day.holiday > 0) {
    parts.push("Festivo");
  }
  if (day.holidayExtra > 0) {
    parts.push("Festivo-extra");
  }
  if (day.isVacation) {
    parts.push("Vacaciones");
  }
  return parts.length === 0 ? "—" : parts.join(" + ");
}

/** Nombre a mostrar del turno de un día resuelto. */
function shiftLabel(
  day: ResolvedDay,
  shiftNames: ReadonlyMap<string, string>,
): string {
  if (day.kind === "rest") {
    return "Descanso";
  }
  if (day.shiftTypeId !== undefined) {
    const name = shiftNames.get(day.shiftTypeId);
    if (name !== undefined && name.length > 0) {
      return name;
    }
  }
  return "Turno";
}

/** Horario legible de un día: "08:00–16:00 · 17:00–19:00" o vacío. */
function intervalsLabel(day: ResolvedDay): string {
  return day.intervals
    .map((interval) => `${interval.start}–${interval.end}`)
    .join(" · ");
}

/**
 * Combina días resueltos y estadísticas en las filas de exportación. El
 * resumen se toma de `statistics`; las filas conservan el orden recibido.
 */
export function buildExportData(input: BuildExportDataInput): ExportData {
  const statisticsByDate = new Map(
    input.statistics.days.map((day) => [day.date, day]),
  );

  const rows: ExportDayRow[] = input.days.map((day) => {
    const statistics = statisticsByDate.get(day.date);
    return {
      date: day.date,
      weekday: format(parseISO(day.date), "EEEE", { locale: es }),
      shift: shiftLabel(day, input.shiftNames),
      intervals: intervalsLabel(day),
      plannedMinutes: day.plannedMinutes,
      actualMinutes: statistics?.actualMinutes ?? 0,
      differenceMinutes: statistics?.differenceMinutes ?? -day.plannedMinutes,
      overtimeMinutes: statistics?.overtimeMinutes ?? 0,
      category: statistics === undefined ? "—" : categoryLabel(statistics),
      isHoliday: statistics?.isHoliday ?? false,
      isExtraDay: statistics?.isExtraDay ?? false,
      isVacation: statistics?.isVacation ?? false,
    };
  });

  const { classified } = input.statistics;

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    timezone: input.timezone,
    generatedAt: input.generatedAt ?? Date.now(),
    summary: {
      plannedMinutes: input.statistics.plannedMinutes,
      actualMinutes: input.statistics.actualMinutes,
      overtimeMinutes: input.statistics.overtimeMinutes,
      differenceMinutes: input.statistics.differenceMinutes,
      normalMinutes: classified.normal,
      extraMinutes: classified.extra,
      holidayMinutes: classified.holiday,
      holidayExtraMinutes: classified.holidayExtra,
      shiftDays: input.statistics.shiftDays,
      restDays: input.statistics.restDays,
      vacationDays: input.statistics.vacationDays,
      recordedDays: input.statistics.recordedDays,
    },
    rows,
  };
}

/** Minutos a horas con dos decimales y punto (apto para hojas de cálculo). */
export function decimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}
