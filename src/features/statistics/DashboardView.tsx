"use client";

/**
 * DashboardView
 * ----------------------------------------------------------------------------
 * Panel principal del usuario: próximos turnos y descansos, resumen del
 * periodo seleccionado, gráfico comparativo de horas previstas y reales y
 * exportación del periodo a CSV o PDF.
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
import {
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Coffee,
  Flame,
  Gauge,
  Palmtree,
  PartyPopper,
  Timer,
  type LucideIcon,
} from "lucide-react";
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
  statisticsRates,
  type StatisticsBucketSize,
} from "@/lib/calculations/statistics";
import { formatHours } from "@/lib/calculations/overtime";
import { daysBetweenLocal, isValidLocalDate } from "@/lib/dates/local-date";
import { DashboardSkeleton } from "./DashboardSkeleton";
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

/** Porcentaje con un decimal, o "—" cuando no hay datos suficientes. */
function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  })} %`;
}

/** Minutos formateados como horas, o "—" cuando no hay datos. */
function formatMinutesOrDash(minutes: number | null): string {
  return minutes === null ? "—" : formatHours(minutes);
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
  // Se desestructura para que las dependencias de los `useMemo` sean valores
  // estables (el objeto `range` se recrea en cada render).
  const { start: rangeStart, end: rangeEnd } = range;
  const rangeValid = isValidRange(range);
  // El dashboard solo resume lo ya transcurrido: si el periodo termina en el
  // futuro, los totales se cortan en hoy para no contar trabajo que aún no se
  // ha hecho. El rango original se conserva para la consulta y el filtro.
  const statsEnd =
    rangeEnd > today && rangeStart <= today ? today : rangeEnd;
  const isPartialPeriod = statsEnd !== rangeEnd;
  // Si el rango no es válido se salta la consulta ("skip") para no pedir
  // datos de un periodo incorrecto o demasiado grande.
  const queryArgs = rangeValid
    ? { startDate: rangeStart, endDate: rangeEnd }
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
  // Días de vacaciones registrados en el periodo, para contarlos y marcarlos
  // en la exportación.
  const vacations = useQuery(
    api.vacations.listRange,
    isAuthenticated && queryArgs !== "skip" ? queryArgs : "skip",
  );
  // Saldo de vacaciones del año del periodo (o del año actual si el rango no
  // es válido). El backend recalcula los días utilizados en cada consulta.
  const balanceYear = rangeValid
    ? Number(rangeEnd.slice(0, 4))
    : new Date().getFullYear();
  const vacationBalance = useQuery(
    api.vacations.getBalance,
    isAuthenticated && rangeValid ? { year: balanceYear } : "skip",
  );

  // --------------------------------------------------------------------------
  // Datos derivados
  // --------------------------------------------------------------------------

  // Índice de tipos de turno por id, para acceso directo al pintar.
  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [String(shift._id), shift])),
    [shifts],
  );

  // Nombres de turno por id, usados por la exportación CSV/PDF. A diferencia
  // de `shiftsById`, solo guarda el nombre (el color no se exporta).
  const shiftNames = useMemo(
    () =>
      new Map((shifts ?? []).map((shift) => [String(shift._id), shift.name])),
    [shifts],
  );

  // Días ya transcurridos dentro del periodo consultado. Es la base de todos
  // los totales: ni las horas previstas ni las reales incluyen días futuros.
  const elapsedDays = useMemo(
    () =>
      calendar === undefined
        ? []
        : calendar.days.filter((day) => day.date <= today),
    [calendar, today],
  );

  // Resumen del periodo. Mientras el calendario carga se devuelve uno vacío;
  // si no, `buildStatistics` combina días, registros de horas, festivos y
  // días extra (excepciones de tipo "extra") y clasifica las horas.
  const summary = useMemo(() => {
    if (calendar === undefined) {
      return emptyStatisticsSummary();
    }
    return buildStatistics({
      days: elapsedDays,
      timeEntries: timeEntries ?? [],
      holidayDates: new Set((holidays ?? []).map((holiday) => holiday.date)),
      extraDates: new Set(
        (overrides ?? [])
          .filter((override) => override.kind === "extra")
          .map((override) => override.date),
      ),
      vacationDates: new Set(
        (vacations ?? []).map((vacation) => vacation.date),
      ),
    });
  }, [calendar, elapsedDays, timeEntries, holidays, overrides, vacations]);

  // Indicadores derivados de los totales del periodo (cumplimiento, medias y
  // peso de las horas extra). La función es pura y no vuelve a calcular horas.
  const rates = useMemo(() => statisticsRates(summary), [summary]);
  // Anchura de la barra de cumplimiento, acotada al rango 0–100.
  const complianceWidth =
    rates.compliancePercent === null
      ? 0
      : Math.min(100, Math.max(0, rates.compliancePercent));

  // Datos de exportación del periodo seleccionado. Se generan una sola vez por
  // cambio de datos y se reutilizan para CSV y PDF. Es `undefined` mientras el
  // calendario carga o el rango no es válido (la consulta está en "skip").
  // Sin `useMemo` manual: el React Compiler lo memoriza a partir de las
  // dependencias reales (el objeto `range` se recrea en cada render).
  const exportData =
    calendar === undefined
      ? undefined
      : buildExportData({
          startDate: rangeStart,
          endDate: statsEnd,
          timezone: calendar.timezone,
          days: elapsedDays,
          statistics: summary,
          shiftNames,
        });

  // Granularidad del gráfico (día, semana o mes) según la longitud del rango
  // ya transcurrido.
  const bucketSize = statisticsBucketSize(rangeStart, statsEnd);
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

  if (isLoading || (isAuthenticated && (calendar === undefined || upcoming === undefined))) {
    return <DashboardSkeleton />;
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
        <Card className="border-border/70 relative overflow-hidden rounded-2xl shadow-2xs transition-shadow hover:shadow-sm">
          <div
            className="from-primary/70 via-primary/30 absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent"
            aria-hidden
          />
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <CalendarClock className="size-5" aria-hidden />
              </span>
              <CardDescription className="text-xs font-medium tracking-wide uppercase">
                Próximo turno
              </CardDescription>
            </div>
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
          <CardContent className="text-muted-foreground flex flex-col gap-1.5 text-sm">
            {nextShift ? (
              <>
                <span className="text-foreground flex flex-wrap items-center gap-2 font-medium capitalize">
                  {format(parseISO(nextShift.date), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                  <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold normal-case">
                    {daysUntilLabel(today, nextShift.date)}
                  </span>
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
        <Card className="border-border/70 relative overflow-hidden rounded-2xl shadow-2xs transition-shadow hover:shadow-sm">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/70 via-emerald-500/30 to-transparent"
            aria-hidden
          />
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Coffee className="size-5" aria-hidden />
              </span>
              <CardDescription className="text-xs font-medium tracking-wide uppercase">
                Próximo descanso
              </CardDescription>
            </div>
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
          <CardContent className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {nextRest ? (
              <>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {daysUntilLabel(today, nextRest.date)}
                </span>
                <Link
                  className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
                  href="/calendar"
                >
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
          modo "Personalizado"), texto con el rango resultante (solo si es
          válido) y botones de exportación */}
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="Periodo de las estadísticas"
          className="bg-muted/60 ring-border/60 flex items-center gap-1 rounded-xl p-1 ring-1"
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
            RangeError. Con rango inválido se muestra el aviso de más abajo.
            Si el periodo llega al futuro, el texto indica que los totales se
            cortan en hoy. */}
        {rangeValid ? (
          <p className="border-border/60 bg-card text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
            {format(parseISO(rangeStart), "d MMM yyyy", { locale: es })}
            {" – "}
            {format(parseISO(statsEnd), "d MMM yyyy", { locale: es })}
            {isPartialPeriod ? " · hasta hoy" : ""}
          </p>
        ) : null}

        {/* Exportación del periodo: solo se muestra con un rango válido; los
            botones se desactivan mientras `exportData` aún no está listo.
            `ml-auto` los empuja al extremo derecho de la fila. */}
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
              icon={Clock}
              iconClassName="bg-primary/10 text-primary"
            />
            <SummaryCard
              label="Horas reales"
              value={formatHours(summary.actualMinutes)}
              icon={Timer}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            {/* Exceso: horas extra registradas sobre los turnos. Es un dato
                siempre positivo; no representa trabajo pendiente. */}
            <SummaryCard
              label="Exceso"
              value={formatHours(summary.overtimeMinutes)}
              icon={Flame}
              iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <SummaryCard
              label="Jornadas"
              value={String(summary.shiftDays)}
              icon={Briefcase}
              iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
            <SummaryCard
              label="Descansos"
              value={String(summary.restDays)}
              icon={Coffee}
              iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <SummaryCard
              label="Festivos"
              value={String(summary.holidayDays)}
              icon={PartyPopper}
              iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <SummaryCard
              label="Vacaciones"
              value={String(summary.vacationDays)}
              icon={Palmtree}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <SummaryCard
              label={`Vacaciones disponibles ${balanceYear}`}
              value={
                vacationBalance === undefined
                  ? "—"
                  : `${vacationBalance.remainingDays} d`
              }
              icon={Palmtree}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              tone={
                vacationBalance !== undefined &&
                vacationBalance.remainingDays < 0
                  ? "negative"
                  : "neutral"
              }
            />
            <SummaryCard
              label="Días registrados"
              value={String(summary.recordedDays)}
              icon={ClipboardCheck}
              iconClassName="bg-slate-500/10 text-slate-600 dark:text-slate-300"
            />
          </div>

          {/* Indicadores derivados: cumplimiento y medias del periodo */}
          <Card className="border-border/70 rounded-2xl shadow-2xs">
            <CardHeader className="border-border/60 border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                  <Gauge className="size-4" aria-hidden />
                </span>
                <div>
                  <CardTitle>Rendimiento del periodo</CardTitle>
                  <CardDescription>
                    Indicadores calculados a partir de las horas del periodo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-4">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Cumplimiento
                  </span>
                  <span className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatPercent(rates.compliancePercent)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Cumplimiento de las horas previstas"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={rates.compliancePercent ?? 0}
                  className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${complianceWidth}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Horas reales sobre horas previstas.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <RateMetric
                  label="Media por jornada"
                  value={formatMinutesOrDash(rates.averagePlannedPerShiftDay)}
                  hint="Horas previstas entre jornadas"
                />
                <RateMetric
                  label="Media real por día"
                  value={formatMinutesOrDash(rates.averageActualPerRecordedDay)}
                  hint="Horas reales entre días registrados"
                />
                <RateMetric
                  label="Peso de las extras"
                  value={formatPercent(rates.overtimeSharePercent)}
                  hint="Horas extra sobre horas reales"
                />
              </div>
            </CardContent>
          </Card>

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
          <Card className="border-border/70 rounded-2xl shadow-2xs">
            <CardHeader className="border-border/60 border-b pb-4">
              <CardTitle>Previstas frente a reales</CardTitle>
              <CardDescription>
                Horas de los días transcurridos, agrupadas por{" "}
                {bucketSize === "day"
                  ? "día"
                  : bucketSize === "week"
                    ? "semana"
                    : "mes"}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {calendar === undefined ? (
                <p className="text-muted-foreground text-sm">Cargando…</p>
              ) : chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay datos en este periodo.
                </p>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid
                        stroke="var(--color-border)"
                        strokeDasharray="4 4"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        unit=" h"
                        fontSize={11}
                        width={48}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                        }}
                        labelStyle={{
                          color: "var(--color-foreground)",
                          fontWeight: 600,
                        }}
                        formatter={(value) => `${Number(value).toFixed(1)} h`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        dataKey="previstas"
                        name="Previstas"
                        fill="var(--color-chart-3)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                      <Bar
                        dataKey="reales"
                        name="Reales"
                        fill="var(--color-chart-2)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
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
  icon: Icon,
  iconClassName,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card className="border-border/70 relative overflow-hidden rounded-2xl shadow-2xs transition-shadow hover:shadow-sm">
      <span
        className={cn(
          "absolute top-3 right-3 flex size-8 items-center justify-center rounded-xl",
          iconClassName,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <CardHeader className="gap-1">
        <CardDescription className="pr-10 text-xs font-medium tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
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
 * Indicador de rendimiento: etiqueta, valor destacado y una pista breve sobre
 * cómo se calcula.
 */
function RateMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </div>
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium shadow-2xs ring-1 ring-black/5 ring-inset dark:ring-white/10",
        className,
      )}
    >
      {label} {formatHours(minutes)}
    </span>
  );
}
