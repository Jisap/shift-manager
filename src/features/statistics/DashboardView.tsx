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
import { cn } from "@/lib/utils";

const UPCOMING_DAYS = 90;
const MAX_RANGE_DAYS = 366;

type FilterMode = "week" | "month" | "year" | "custom";

const FILTER_LABELS: Record<FilterMode, string> = {
  week: "Semana",
  month: "Mes",
  year: "Año",
  custom: "Personalizado",
};

type DateRange = { start: string; end: string };

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

function isValidRange(range: DateRange): boolean {
  return (
    isValidLocalDate(range.start) &&
    isValidLocalDate(range.end) &&
    range.end >= range.start &&
    daysBetweenLocal(range.start, range.end) + 1 <= MAX_RANGE_DAYS
  );
}

function bucketLabel(key: string, size: StatisticsBucketSize): string {
  if (size === "month") {
    return format(parseISO(`${key}-01`), "MMM yy", { locale: es });
  }
  return format(parseISO(key), "d MMM", { locale: es });
}

function formatDifference(minutes: number): string {
  if (minutes === 0) {
    return "0 h";
  }
  return `${minutes > 0 ? "+" : "−"}${formatHours(Math.abs(minutes))}`;
}

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
  const { isAuthenticated, isLoading } = useConvexAuth();

  const today = format(new Date(), "yyyy-MM-dd");
  const [filter, setFilter] = useState<FilterMode>("month");
  const [customStart, setCustomStart] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const range = rangeForFilter(filter, customStart, customEnd, new Date());
  const rangeValid = isValidRange(range);
  const queryArgs = rangeValid
    ? { startDate: range.start, endDate: range.end }
    : "skip";
  const upcomingArgs = {
    startDate: today,
    endDate: format(addDays(new Date(), UPCOMING_DAYS), "yyyy-MM-dd"),
  };

  const calendar = useQuery(
    api.calendar.getRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  const upcoming = useQuery(
    api.calendar.getRange,
    isAuthenticated ? upcomingArgs : "skip",
  );
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  const timeEntries = useQuery(
    api.timeEntries.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  const holidays = useQuery(
    api.holidays.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  const overrides = useQuery(
    api.overrides.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );

  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [String(shift._id), shift])),
    [shifts],
  );

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

  const bucketSize = statisticsBucketSize(range.start, range.end);
  const chartData = bucketStatistics(summary.days, bucketSize).map(
    (bucket) => ({
      label: bucketLabel(bucket.key, bucketSize),
      previstas: Math.round((bucket.plannedMinutes / 60) * 10) / 10,
      reales: Math.round((bucket.actualMinutes / 60) * 10) / 10,
    }),
  );

  const nextShift = upcoming?.days.find((day) => day.kind === "shift");
  const nextRest = upcoming?.days.find((day) => day.kind === "rest");
  const nextShiftType =
    nextShift?.shiftTypeId === undefined
      ? undefined
      : shiftsById.get(nextShift.shiftTypeId);

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

      {/* Filtros del periodo */}
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

        <p className="text-muted-foreground text-sm">
          {format(parseISO(range.start), "d MMM yyyy", { locale: es })}
          {" – "}
          {format(parseISO(range.end), "d MMM yyyy", { locale: es })}
        </p>
      </div>

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

          {/* Desglose por categoría */}
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

          {/* Gráfico comparativo */}
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
