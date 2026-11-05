"use client";

/**
 * DashboardView
 * ----------------------------------------------------------------------------
 * Panel principal del usuario: próximos turnos y descansos, resumen del
 * periodo seleccionado y gráfico comparativo de horas previstas y reales.
 *
 * Los cálculos viven en `src/lib/calculations/statistics.ts`; este componente
 * solo carga datos de Convex, compone el rango y presenta el resultado.
 */

import { useConvexAuth, useQuery } from "convex/react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bucketStatistics,
  buildStatistics,
  emptyStatisticsSummary,
  statisticsBucketSize,
  type StatisticsBucketSize,
} from "@/lib/calculations/statistics";
import { formatHours } from "@/lib/calculations/overtime";
import { daysBetweenLocal, isValidLocalDate } from "@/lib/dates/local-date";
import { buildExportData } from "@/lib/export/export-data";
import { cn } from "@/lib/utils";
import { ExportButtons } from "./export/ExportButtons";

// Ventana (en días desde hoy) en la que se busca el próximo turno/descanso.
const UPCOMING_DAYS = 90;
// Tope de días del periodo de estadísticas, para acotar el volumen de datos
// que se pide al backend.
const MAX_RANGE_DAYS = 366;

// Periodos predefinidos del filtro, más uno de fechas libres.
type FilterMode = "week" | "month" | "year" | "custom";

// Texto de cada botón del filtro. El orden de las claves define el orden
// en pantalla.
const FILTER_LABELS: Record<FilterMode, string> = {
  week: "Semana",
  month: "Mes",
  year: "Año",
  custom: "Personalizado",
};

// Rango de fechas locales en formato "yyyy-MM-dd" (ambos extremos incluidos).
type DateRange = { start: string; end: string };

/**
 * Calcula el rango de fechas de un filtro respecto a una fecha de referencia.
 * Las semanas empiezan en lunes. En modo "custom" devuelve las fechas
 * introducidas tal cual, sin validar (eso lo hace `isValidRange`).
 */
function rangeForFilter(
  filter: FilterMode,
  customStart: string,
  customEnd: string,
  reference: Date,
): DateRange {
  if (filter === "week") {
    return {
      start: format(startOfWeek(reference, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(reference, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (filter === "month") {
    return {
      start: format(startOfMonth(reference), "yyyy-MM-dd"),
      end: format(endOfMonth(reference), "yyyy-MM-dd"),
    };
  }
  if (filter === "year") {
    return {
      start: format(startOfYear(reference), "yyyy-MM-dd"),
      end: format(endOfYear(reference), "yyyy-MM-dd"),
    };
  }
  return { start: customStart, end: customEnd };
}

/**
 * Un rango es válido si ambas fechas existen, están en orden (fin >= inicio)
 * y no superan `MAX_RANGE_DAYS` días. Las fechas "yyyy-MM-dd" se comparan
 * como texto porque ese formato ordena igual que el calendario.
 */
function isValidRange(range: DateRange): boolean {
  return (
    isValidLocalDate(range.start) &&
    isValidLocalDate(range.end) &&
    range.end >= range.start &&
    daysBetweenLocal(range.start, range.end) + 1 <= MAX_RANGE_DAYS
  );
}

/**
 * Etiqueta del eje X del gráfico. Las agrupaciones por mes llegan como
 * "yyyy-MM" (se añade "-01" para poder parsearlas); las de día y semana,
 * como fecha completa.
 */
function bucketLabel(key: string, size: StatisticsBucketSize): string {
  if (size === "month") {
    return format(parseISO(`${key}-01`), "MMM yy", { locale: es });
  }
  return format(parseISO(key), "d MMM", { locale: es });
}

/** Diferencia en minutos con signo explícito: "+2 h", "−1 h" o "0 h". */
function formatDifference(minutes: number): string {
  if (minutes === 0) {
    return "0 h";
  }
  return `${minutes > 0 ? "+" : "−"}${formatHours(Math.abs(minutes))}`;
}

/**
 * Devuelve el día más temprano del tipo indicado. No depende del orden en que
 * lleguen los días desde el backend.
 * La comparación es textual (`<`) porque "yyyy-MM-dd" ordena igual que el
 * calendario; si hubiera dos días con la misma fecha se conserva el primero.
 */
function earliestDay<T extends { date: string; kind: "shift" | "rest" }>(
  days: T[] | undefined,
  kind: "shift" | "rest",
): T | undefined {
  if (days === undefined) {
    return undefined;
  }
  let earliest: T | undefined;
  for (const day of days) {
    if (
      day.kind === kind &&
      (earliest === undefined || day.date < earliest.date)
    ) {
      earliest = day;
    }
  }
  return earliest;
}

/** Texto relativo hasta una fecha: "Hoy", "Mañana" o "En N días". */
function daysUntilLabel(today: string, date: string): string {
  const days = daysBetweenLocal(today, date);
  if (days <= 0) {
    return "Hoy";
  }
  if (days === 1) {
    return "Mañana";
  }
  return `En ${days} días`;
}

export function DashboardView() {
  // Estado de la sesión de Convex. Sin sesión no se lanzan las queries.
  const { isAuthenticated, isLoading } = useConvexAuth();

  // --------------------------------------------------------------------------
  // Filtro y rango del periodo
  // --------------------------------------------------------------------------

  // Clave de hoy ("yyyy-MM-dd"): origen de la ventana de próximos días.
  const today = format(new Date(), "yyyy-MM-dd");
  const [filter, setFilter] = useState<FilterMode>("month");
  // Fechas del modo personalizado; empiezan en el mes actual.
  const [customStart, setCustomStart] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const range = rangeForFilter(filter, customStart, customEnd, new Date());
  const rangeValid = isValidRange(range);
  // Si el rango no es válido se salta la consulta ("skip") para no pedir
  // datos de un periodo incorrecto o demasiado grande.
  const queryArgs = rangeValid
    ? { startDate: range.start, endDate: range.end }
    : "skip";
  // Rango fijo de los próximos turnos/descansos; no depende del filtro.
  const upcomingArgs = {
    startDate: today,
    endDate: format(addDays(new Date(), UPCOMING_DAYS), "yyyy-MM-dd"),
  };

  // --------------------------------------------------------------------------
  // Consultas a Convex
  // --------------------------------------------------------------------------
  // Se usa "skip" mientras no hay sesión (y, en las del periodo, mientras el
  // rango no es válido).

  // Calendario resuelto del periodo seleccionado (turno y minutos por día).
  const calendar = useQuery(
    api.calendar.getRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  // Calendario de los próximos días, para el próximo turno y descanso.
  const upcoming = useQuery(
    api.calendar.getRange,
    isAuthenticated ? upcomingArgs : "skip",
  );
  // Tipos de turno (nombre y color) para mostrar el próximo turno.
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  // Horas reales y extra registradas en el periodo.
  const timeEntries = useQuery(
    api.timeEntries.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  // Festivos y excepciones del periodo: sirven para clasificar las horas.
  const holidays = useQuery(
    api.holidays.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  const overrides = useQuery(
    api.overrides.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );

  // --------------------------------------------------------------------------
  // Datos derivados
  // --------------------------------------------------------------------------

  // Índice de tipos de turno por id, para acceso directo al pintar.
  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [String(shift._id), shift])),
    [shifts],
  );

  // Nombres de turno por id, usados por la exportación CSV/PDF.
  const shiftNames = useMemo(
    () =>
      new Map((shifts ?? []).map((shift) => [String(shift._id), shift.name])),
    [shifts],
  );

  // Resumen del periodo. Mientras el calendario carga se devuelve uno vacío;
  // si no, `buildStatistics` combina días, registros de horas, festivos y
  // días extra (excepciones de tipo "extra") y clasifica las horas.
  const summary = useMemo(() => {
    if (calendar === undefined) {
      return emptyStatisticsSummary();
    }
    return buildStatistics({
      days: calendar.days,
      timeEntries: timeEntries ?? [],
      holidayDates: new Set((holidays ?? []).map((holiday) => holiday.date)),
      extraDates: new Set(
        (overrides ?? [])
          .filter((override) => override.kind === "extra")
          .map((override) => override.date),
      ),
    });
  }, [calendar, timeEntries, holidays, overrides]);

  // Datos de exportación del periodo seleccionado. Se generan una sola vez por
  // cambio de datos y se reutilizan para CSV y PDF.
  const exportData = useMemo(() => {
    if (calendar === undefined) {
      return undefined;
    }
    return buildExportData({
      startDate: range.start,
      endDate: range.end,
      timezone: calendar.timezone,
      days: calendar.days,
      statistics: summary,
      shiftNames,
    });
  }, [calendar, range.start, range.end, summary, shiftNames]);

  // Granularidad del gráfico (día, semana o mes) según la longitud del rango.
  const bucketSize = statisticsBucketSize(range.start, range.end);
  // Datos de Recharts: minutos pasados a horas con un decimal.
  const chartData = bucketStatistics(summary.days, bucketSize).map(
    (bucket) => ({
      label: bucketLabel(bucket.key, bucketSize),
      previstas: Math.round((bucket.plannedMinutes / 60) * 10) / 10,
      reales: Math.round((bucket.actualMinutes / 60) * 10) / 10,
    }),
  );

  // Próximo turno y próximo descanso de la ventana de próximos días: el día
  // más temprano de cada tipo, sin depender del orden en que llegue `days`.
  const nextShift = earliestDay(upcoming?.days, "shift");
  const nextRest = earliestDay(upcoming?.days, "rest");
  const nextShiftType =
    nextShift?.shiftTypeId === undefined
      ? undefined
      : shiftsById.get(nextShift.shiftTypeId);

  // --------------------------------------------------------------------------
  // Estados tempranos: cargando y sin sesión
  // --------------------------------------------------------------------------

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para consultar tus estadísticas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/signin">Ir a iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Próximo turno y próximo descanso */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximo turno: nombre con su color, fecha, horario y duración */}
        <Card>
          <CardHeader>
            <CardDescription>Próximo turno</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              {nextShiftType ? (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: nextShiftType.color }}
                  aria-hidden
                />
              ) : null}
              {nextShiftType?.name ??
                (upcoming === undefined ? "Calculando…" : "Sin turnos")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-col gap-1 text-sm">
            {nextShift ? (
              <>
                <span className="text-foreground font-medium capitalize">
                  {format(parseISO(nextShift.date), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                  {" · "}
                  {daysUntilLabel(today, nextShift.date)}
                </span>
                <span>
                  {nextShift.intervals
                    .map((interval) => `${interval.start}–${interval.end}`)
                    .join(" · ") || "Sin horario"}
                  {" · "}
                  {formatHours(nextShift.plannedMinutes)}
                </span>
              </>
            ) : (
              <span>
                {upcoming === undefined
                  ? "Cargando…"
                  : `No hay turnos en los próximos ${UPCOMING_DAYS} días.`}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Próximo descanso: fecha, cuánto falta y enlace al calendario */}
        <Card>
          <CardHeader>
            <CardDescription>Próximo descanso</CardDescription>
            <CardTitle className="text-xl">
              {nextRest
                ? format(parseISO(nextRest.date), "EEEE d 'de' MMMM", {
                  locale: es,
                })
                : upcoming === undefined
                  ? "Calculando…"
                  : "Sin descansos"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {nextRest ? (
              <>
                <span className="text-foreground font-medium">
                  {daysUntilLabel(today, nextRest.date)}
                </span>
                {" · "}
                <Link className="underline" href="/calendar">
                  Ver calendario
                </Link>
              </>
            ) : (
              <span>
                {upcoming === undefined
                  ? "Cargando…"
                  : `No hay descansos en los próximos ${UPCOMING_DAYS} días.`}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros del periodo: botones predefinidos, fechas libres (solo en
          modo "Personalizado") y texto con el rango resultante (solo si es
          válido) */}
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="Periodo de las estadísticas"
          className="bg-muted flex items-center gap-1 rounded-lg p-1"
        >
          {(Object.keys(FILTER_LABELS) as FilterMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={filter === mode ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={filter === mode}
              onClick={() => setFilter(mode)}
            >
              {FILTER_LABELS[mode]}
            </Button>
          ))}
        </div>

        {/* Selectores de fecha: cada uno limita al otro con `max`/`min`
            para que el usuario no pueda invertir el rango desde el selector */}
        {filter === "custom" ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="statistics-start" className="text-xs">
                Desde
              </Label>
              <Input
                id="statistics-start"
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-8 w-auto"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="statistics-end" className="text-xs">
                Hasta
              </Label>
              <Input
                id="statistics-end"
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-8 w-auto"
              />
            </div>
          </div>
        ) : null}

        {/* El rango solo se formatea si es válido: con una fecha vacía
            `parseISO` devuelve una fecha inválida y `format` lanzaría un
            RangeError. Con rango inválido se muestra el aviso de más abajo. */}
        {rangeValid ? (
          <p className="text-muted-foreground text-sm">
            {format(parseISO(range.start), "d MMM yyyy", { locale: es })}
            {" – "}
            {format(parseISO(range.end), "d MMM yyyy", { locale: es })}
          </p>
        ) : null}

        {/* Exportación del periodo: solo con un rango válido y datos cargados */}
        {rangeValid ? (
          <div className="ml-auto">
            <ExportButtons data={exportData} />
          </div>
        ) : null}
      </div>

      {/* Si el rango no es válido se muestra el motivo y no se pinta nada más */}
      {!rangeValid ? (
        <p className="text-destructive text-sm">
          El periodo debe tener fechas válidas, estar en orden y no superar{" "}
          {MAX_RANGE_DAYS} días.
        </p>
      ) : (
        <>
          {/* Totales del periodo */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Horas previstas"
              value={formatHours(summary.plannedMinutes)}
            />
            <SummaryCard
              label="Horas reales"
              value={formatHours(summary.actualMinutes)}
            />
            {/* La diferencia se colorea: verde si se trabajó de más, rojo si
                de menos y neutro si coincide con lo previsto */}
            <SummaryCard
              label="Diferencia"
              value={formatDifference(summary.differenceMinutes)}
              tone={
                summary.differenceMinutes === 0
                  ? "neutral"
                  : summary.differenceMinutes > 0
                    ? "positive"
                    : "negative"
              }
            />
            <SummaryCard
              label="Horas extra"
              value={formatHours(summary.overtimeMinutes)}
            />
            <SummaryCard label="Jornadas" value={String(summary.shiftDays)} />
            <SummaryCard label="Descansos" value={String(summary.restDays)} />
            <SummaryCard label="Festivos" value={String(summary.holidayDays)} />
            <SummaryCard
              label="Días registrados"
              value={String(summary.recordedDays)}
            />
          </div>

          {/* Desglose por categoría (mismos colores que en el calendario);
              `CategoryBadge` no pinta las categorías sin horas */}
          {summary.classified.total > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <CategoryBadge
                label="Normal"
                minutes={summary.classified.normal}
                className="bg-muted text-muted-foreground"
              />
              <CategoryBadge
                label="Extra"
                minutes={summary.classified.extra}
                className="bg-sky-500/15 text-sky-700 dark:text-sky-300"
              />
              <CategoryBadge
                label="Festivo"
                minutes={summary.classified.holiday}
                className="bg-amber-500/15 text-amber-700 dark:text-amber-300"
              />
              <CategoryBadge
                label="Festivo-extra"
                minutes={summary.classified.holidayExtra}
                className="bg-violet-500/15 text-violet-700 dark:text-violet-300"
              />
            </div>
          ) : null}

          {/* Gráfico comparativo: barras de horas previstas y reales por
              día, semana o mes según la longitud del periodo */}
          <Card>
            <CardHeader>
              <CardTitle>Previstas frente a reales</CardTitle>
              <CardDescription>
                Horas agrupadas por{" "}
                {bucketSize === "day"
                  ? "día"
                  : bucketSize === "week"
                    ? "semana"
                    : "mes"}
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendar === undefined ? (
                <p className="text-muted-foreground text-sm">Cargando…</p>
              ) : chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay datos en este periodo.
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis unit=" h" fontSize={11} width={48} />
                      <Tooltip
                        formatter={(value) => `${Number(value).toFixed(1)} h`}
                      />
                      <Legend />
                      <Bar
                        dataKey="previstas"
                        name="Previstas"
                        fill="var(--color-chart-3)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="reales"
                        name="Reales"
                        fill="var(--color-chart-2)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Tarjeta con una etiqueta y un valor destacado. `tone` colorea el valor:
 * verde (positivo), rojo (negativo) o el color por defecto (neutral).
 */
function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

/**
 * Etiqueta de una categoría de horas con su duración. No renderiza nada si
 * la categoría no tiene minutos.
 */
function CategoryBadge({
  label,
  minutes,
  className,
}: {
  label: string;
  minutes: number;
  className: string;
}) {
  if (minutes <= 0) {
    return null;
  }
  return (
    <span className={cn("rounded px-2 py-1 font-medium", className)}>
      {label} {formatHours(minutes)}
    </span>
  );
}