"use client";

/**
 * CalendarView
 * ----------------------------------------------------------------------------
 * Vistas mensual, semanal, diaria y agenda del calendario de turnos. Muestra,
 * para cada día:
 *   - el turno planificado (o "Descanso"),
 *   - festivos,
 *   - horas reales trabajadas,
 *   - horas extra,
 *   - cambios puntuales (excepciones/overrides) y sus notas.
 *
 * Al pulsar un día se abre un panel con cuatro editores (excepción, horas
 * reales, horas extra y festivos). Los datos vienen de Convex en tiempo real.
 *
 * La interfaz es responsive (celdas compactas en móvil) y accesible: cada día
 * tiene una etiqueta descriptiva, "hoy" se marca con `aria-current` y los
 * grupos de controles están etiquetados.
 */

import { useConvexAuth, useQuery } from "convex/react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  setDate,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  classifyDayMinutes,
  sumClassifiedMinutes,
} from "@/lib/calculations/classification";
import { formatHours } from "@/lib/calculations/overtime";
import { DayActualEditor } from "./DayActualEditor";
import { DayHolidayEditor } from "./DayHolidayEditor";
import { DayOvertimeEditor } from "./DayOvertimeEditor";
import { DayOverrideEditor } from "./DayOverrideEditor";

// Cabecera de columnas del grid. El orden empieza en lunes, igual que
// `weekStartsOn: 1` en las funciones de date-fns más abajo.
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Modos de visualización disponibles. "agenda" es un listado del mes.
type CalendarViewMode = "month" | "week" | "day" | "agenda";

// Etiquetas accesibles de los botones de navegación por vista.
const PREVIOUS_LABEL: Record<CalendarViewMode, string> = {
  month: "Mes anterior",
  week: "Semana anterior",
  day: "Día anterior",
  agenda: "Mes anterior",
};
const NEXT_LABEL: Record<CalendarViewMode, string> = {
  month: "Mes siguiente",
  week: "Semana siguiente",
  day: "Día siguiente",
  agenda: "Mes siguiente",
};

export function CalendarView() {
  // --------------------------------------------------------------------------
  // Estado y autenticación
  // --------------------------------------------------------------------------

  // Estado de la sesión de Convex. Sin sesión no se lanzan las queries.
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Modo de visualización: mes, semana, día o agenda (listado mensual).
  const [view, setView] = useState<CalendarViewMode>("month");
  // Fecha de referencia: cualquier día dentro del periodo visualizado
  // (empieza en hoy). El mes, la semana o el día se derivan de ella según la
  // vista activa.
  const [cursor, setCursor] = useState(() => new Date());
  // Fecha seleccionada ("yyyy-MM-dd") o null si no hay ninguna.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Rangos de fechas
  // --------------------------------------------------------------------------

  // En la vista mensual y en la agenda el periodo es el mes del cursor. En la
  // vista semanal es la semana y en la diaria, el propio día.
  const isMonthly = view === "month" || view === "agenda";
  const periodStart = isMonthly
    ? startOfMonth(cursor)
    : view === "week"
      ? startOfWeek(cursor, { weekStartsOn: 1 })
      : cursor;
  const periodEnd = isMonthly
    ? endOfMonth(cursor)
    : view === "week"
      ? endOfWeek(cursor, { weekStartsOn: 1 })
      : cursor;
  // El grid mensual se amplía a semanas completas (lunes como primer día) para
  // no tener filas incompletas. La semana y el día ya son exactos y no
  // necesitan relleno. La agenda, en cambio, lista solo el periodo estricto.
  const gridStart = isMonthly
    ? startOfWeek(periodStart, { weekStartsOn: 1 })
    : periodStart;
  const gridEnd = isMonthly
    ? endOfWeek(periodEnd, { weekStartsOn: 1 })
    : periodEnd;
  // Rango completo del grid (incluye días de relleno de otros meses).
  // Es el que se pide al backend.
  const startDate = format(gridStart, "yyyy-MM-dd");
  const endDate = format(gridEnd, "yyyy-MM-dd");
  // Rango estricto del periodo: se usa para los totales, que no deben contar
  // los días de relleno.
  const periodStartKey = format(periodStart, "yyyy-MM-dd");
  const periodEndKey = format(periodEnd, "yyyy-MM-dd");
  // Clave de hoy, para resaltarlo en el grid.
  const todayKey = format(new Date(), "yyyy-MM-dd");
  // Año actual del cursor y rango de años ofrecido en el selector. Se amplía
  // con el año visible para que nunca desaparezca al navegar fuera del rango.
  const currentYear = new Date().getFullYear();
  const cursorYear = cursor.getFullYear();
  const firstYear = Math.min(currentYear - 5, cursorYear);
  const lastYear = Math.max(currentYear + 5, cursorYear);
  const yearOptions = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index,
  );

  // Navegación: avanza día, semana o mes según la vista activa.
  const moveCursor = (amount: number) =>
    setCursor((current) => {
      if (isMonthly) {
        return addMonths(current, amount);
      }
      if (view === "week") {
        return addWeeks(current, amount);
      }
      return addDays(current, amount);
    });

  // Etiqueta textual del periodo mostrado en la cabecera.
  const periodTitle = isMonthly
    ? format(cursor, "MMMM 'de' yyyy", { locale: es })
    : view === "week"
      ? `${format(gridStart, "d MMM", { locale: es })} – ${format(gridEnd, "d MMM yyyy", { locale: es })}`
      : format(cursor, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  // Texto para el resumen de horas ("X previstas este mes / esta semana / este día").
  const periodLabel = isMonthly
    ? "este mes"
    : view === "week"
      ? "esta semana"
      : "este día";

  // --------------------------------------------------------------------------
  // Consultas a Convex
  // --------------------------------------------------------------------------
  // Se usa "skip" mientras no hay sesión para no lanzar queries no autorizadas.

  // Calendario resuelto por el motor (turno, intervalos, minutos planificados...).
  const calendar = useQuery(
    api.calendar.getRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );
  // Tipos de turno del usuario (nombre y color).
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  // `overrides` se carga en paralelo al calendario para poder leer notas
  // y el estado de excepción activa sin esperar a que el motor las resuelva.
  const overrides = useQuery(
    api.overrides.listRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );
  // Festivos del rango.
  const holidays = useQuery(
    api.holidays.listRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );
  // Registros de horas reales y horas extra por día.
  const timeEntries = useQuery(
    api.timeEntries.listRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );

  // --------------------------------------------------------------------------
  // Índices derivados (arrays -> Map)
  // --------------------------------------------------------------------------

  // Los datos de Convex llegan como arrays; los convertimos a Map para
  // acceso O(1) por id/fecha en el render del grid.
  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [String(shift._id), shift])),
    [shifts],
  );
  const daysByDate = useMemo(
    () => new Map((calendar?.days ?? []).map((day) => [day.date, day])),
    [calendar],
  );
  const overridesByDate = useMemo(
    () =>
      new Map((overrides ?? []).map((override) => [override.date, override])),
    [overrides],
  );
  // La excepción del día seleccionado se pasa al editor para pre-rellenar el formulario.
  const selectedOverride =
    selectedDate === null ? undefined : overridesByDate.get(selectedDate);
  // Un mismo día puede tener varios festivos (p. ej. nacional + local),
  // por eso el Map guarda una lista por fecha.
  const holidaysByDate = useMemo(() => {
    type HolidayList = NonNullable<typeof holidays>;
    const map = new Map<string, HolidayList>();
    for (const holiday of holidays ?? []) {
      const list = map.get(holiday.date) ?? [];
      list.push(holiday);
      map.set(holiday.date, list);
    }
    return map;
  }, [holidays]);

  // --------------------------------------------------------------------------
  // Datos del día seleccionado (se pasan a los editores)
  // --------------------------------------------------------------------------

  const selectedHolidays =
    selectedDate === null ? [] : (holidaysByDate.get(selectedDate) ?? []);
  // Día tal como lo resolvió el motor (turno, intervalos, minutos previstos).
  const selectedResolved =
    selectedDate === null ? undefined : daysByDate.get(selectedDate);
  // Tipo de turno asignado al día seleccionado, si lo hay.
  const selectedShift =
    selectedResolved?.shiftTypeId !== undefined
      ? shiftsById.get(selectedResolved.shiftTypeId)
      : undefined;
  // Número de festivos dentro del periodo (excluye los del relleno del grid).
  const periodHolidays = (holidays ?? []).filter(
    (holiday) => holiday.date >= periodStartKey && holiday.date <= periodEndKey,
  ).length;
  const timeEntriesByDate = useMemo(
    () => new Map((timeEntries ?? []).map((entry) => [entry.date, entry])),
    [timeEntries],
  );
  // Registro de horas (reales/extra) del día seleccionado.
  const selectedOvertime =
    selectedDate === null ? undefined : timeEntriesByDate.get(selectedDate);

  // --------------------------------------------------------------------------
  // Cálculo de minutos reales y totales del periodo (mes, semana o día)
  // --------------------------------------------------------------------------

  // Minutos realmente trabajados en un registro: (fin - inicio) - descanso.
  // `actualStart`/`actualEnd` son timestamps en milisegundos. Si falta alguno
  // devuelve 0, y nunca devuelve valores negativos.
  const actualMinutesOf = (entry: {
    actualStart?: number;
    actualEnd?: number;
    breakMinutes: number;
  }): number => {
    if (entry.actualStart === undefined || entry.actualEnd === undefined) {
      return 0;
    }
    return Math.max(
      0,
      Math.round((entry.actualEnd - entry.actualStart) / 60000) -
        entry.breakMinutes,
    );
  };
  // Total de minutos reales del periodo.
  const periodActualMinutes = (timeEntries ?? [])
    .filter(
      (entry) => entry.date >= periodStartKey && entry.date <= periodEndKey,
    )
    .reduce((total, entry) => total + actualMinutesOf(entry), 0);
  // Desglose del periodo por categoría (normal / extra / festivo / festivo-extra).
  // Cada día se clasifica según sus minutos reales, sus minutos extra y si es
  // festivo o día extra (excepción de tipo "extra"); luego se suman.
  const periodClassification = sumClassifiedMinutes(
    (timeEntries ?? [])
      .filter(
        (entry) => entry.date >= periodStartKey && entry.date <= periodEndKey,
      )
      .map((entry) =>
        classifyDayMinutes({
          actualMinutes: actualMinutesOf(entry),
          overtimeMinutes: entry.overtimeMinutes ?? 0,
          isHoliday: holidaysByDate.has(entry.date),
          isExtraDay: overridesByDate.get(entry.date)?.kind === "extra",
        }),
      ),
  );
  // Total de minutos planificados en el periodo (excluye los días de relleno
  // que el grid mensual incluye para completar semanas).
  const periodMinutes = (calendar?.days ?? [])
    .filter((day) => day.date >= periodStartKey && day.date <= periodEndKey)
    .reduce((total, day) => total + day.plannedMinutes, 0);
  // Días del grid: incluye el relleno de las semanas vecinas en la vista mensual.
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  // Días estrictos del periodo: la agenda no debe listar el relleno del grid.
  const periodDays = eachDayOfInterval({
    start: periodStart,
    end: periodEnd,
  });

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
            Necesitas una cuenta para consultar tu calendario.
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
      {/* ------------------------------------------------------------------
          Cabecera: vista, navegación del periodo y resumen de horas
          ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de vista: Mes / Semana / Día / Agenda.
              `role="group"` + `aria-label` lo anuncian como un conjunto de
              botones con nombre; `aria-pressed` indica la vista activa. */}
          <div
            role="group"
            aria-label="Vista del calendario"
            className="bg-muted flex items-center gap-1 rounded-lg p-1"
          >
            <Button
              type="button"
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Mes
            </Button>
            <Button
              type="button"
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "week"}
              onClick={() => setView("week")}
            >
              Semana
            </Button>
            <Button
              type="button"
              variant={view === "day" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "day"}
              onClick={() => setView("day")}
            >
              Día
            </Button>
            <Button
              type="button"
              variant={view === "agenda" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view === "agenda"}
              onClick={() => setView("agenda")}
            >
              Agenda
            </Button>
          </div>
          {/* Navegación: periodo anterior / título / periodo siguiente / hoy /
              año. Con `flex-wrap` los controles bajan de línea en pantallas
              estrechas. */}
          <div
            role="group"
            aria-label="Navegación del periodo"
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={PREVIOUS_LABEL[view]}
              onClick={() => moveCursor(-1)}
            >
              <ChevronLeft />
            </Button>
            {/* `aria-live="polite"`: los lectores de pantalla anuncian el nuevo
                periodo al navegar. El ancho mínimo es menor en móvil. */}
            <h2
              aria-live="polite"
              className="min-w-32 text-center text-base font-semibold capitalize sm:min-w-48 sm:text-lg"
            >
              {periodTitle}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={NEXT_LABEL[view]}
              onClick={() => moveCursor(1)}
            >
              <ChevronRight />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCursor(new Date())}
            >
              Hoy
            </Button>
            {/* Selector de año: salta al mismo día/mes del año elegido.
                La etiqueta es solo para lectores de pantalla (`sr-only`). */}
            <div className="flex items-center gap-1">
              <label htmlFor="calendar-year" className="sr-only">
                Año
              </label>
              <select
                id="calendar-year"
                value={cursorYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setCursor((current) => {
                    // Se parte del día 1 para evitar que el 29 de febrero salte
                    // a marzo al elegir un año no bisiesto; luego se restaura
                    // el día original con tope en el último del mes.
                    const monthStart = setYear(startOfMonth(current), nextYear);
                    return setDate(
                      monthStart,
                      Math.min(current.getDate(), getDaysInMonth(monthStart)),
                    );
                  });
                }}
                className="border-border bg-background hover:bg-muted focus-visible:ring-ring/50 h-7 rounded-lg border px-2 text-sm font-medium transition focus-visible:ring-3 focus-visible:outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Resumen del periodo: horas previstas, reales (si hay) y festivos.
            Alineado a la izquierda en móvil y a la derecha desde `sm`. */}
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-muted-foreground text-sm">
            {calendar === undefined
              ? "Calculando…"
              : `${formatHours(periodMinutes)} previstas ${periodLabel}${
                  periodActualMinutes > 0
                    ? ` · ${formatHours(periodActualMinutes)} reales`
                    : ""
                } · ${periodHolidays} ${
                  periodHolidays === 1 ? "festivo" : "festivos"
                }`}
          </div>
          {/* Desglose por categoría; cada etiqueta solo aparece si tiene horas */}
          {periodClassification.total > 0 ? (
            <div className="flex flex-wrap justify-start gap-1.5 text-[11px] sm:justify-end">
              {periodClassification.normal > 0 ? (
                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-medium">
                  Normal {formatHours(periodClassification.normal)}
                </span>
              ) : null}
              {periodClassification.extra > 0 ? (
                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                  Extra {formatHours(periodClassification.extra)}
                </span>
              ) : null}
              {periodClassification.holiday > 0 ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                  Festivo {formatHours(periodClassification.holiday)}
                </span>
              ) : null}
              {periodClassification.holidayExtra > 0 ? (
                <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-700 dark:text-violet-300">
                  Festivo-extra {formatHours(periodClassification.holidayExtra)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Panel de edición del día seleccionado (cuatro editores)
          ------------------------------------------------------------------ */}
      {selectedDate ? (
        // La `key` incluye el id de la excepción (o "new") para que React
        // destruya y recree el editor al cambiar de día o al guardar/eliminar.
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Cambio puntual de turno (excepción) para este día */}
          <DayOverrideEditor
            key={`${selectedDate}-${selectedOverride?._id ?? "new"}`}
            date={selectedDate}
            shifts={shifts ?? []}
            existing={selectedOverride}
            onClose={() => setSelectedDate(null)}
          />
          {/* Horas reales de entrada/salida y descanso. La key depende de
              inicio/fin para reiniciar el formulario cuando cambian. */}
          <DayActualEditor
            key={`${selectedDate}-actual-${selectedOvertime?.actualStart ?? "none"}-${selectedOvertime?.actualEnd ?? "none"}`}
            date={selectedDate}
            timezone={calendar?.timezone ?? "Europe/Madrid"}
            plannedMinutes={selectedResolved?.plannedMinutes ?? 0}
            shiftTypeId={selectedShift?._id}
            shiftIntervals={selectedResolved?.intervals ?? []}
            existing={selectedOvertime}
          />
          {/* Horas extra del día */}
          <DayOvertimeEditor
            key={`${selectedDate}-${selectedOvertime?.overtimeMinutes ?? "none"}`}
            date={selectedDate}
            isHoliday={selectedHolidays.length > 0}
            shiftTypeId={selectedShift?._id}
            shiftName={selectedShift?.name}
            shiftIntervals={selectedResolved?.intervals ?? []}
            existing={selectedOvertime}
          />
          {/* Alta/baja de festivos del día. La key cambia con el nº de festivos. */}
          <DayHolidayEditor
            key={`${selectedDate}-holidays-${selectedHolidays.length}`}
            date={selectedDate}
            holidays={selectedHolidays}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------------
          Cabecera de días de la semana (solo en las vistas de 7 columnas:
          mes y semana; el día y la agenda no la necesitan)
          ------------------------------------------------------------------ */}
      {view === "month" || view === "week" ? (
        <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs font-medium">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}
        </div>
      ) : null}

      {/* ------------------------------------------------------------------
          Contenido principal según la vista:
            - agenda: lista vertical, una fila por día,
            - mes / semana / día: grid de celdas (7 columnas, o 1 en el día).
          ------------------------------------------------------------------ */}
      {calendar === undefined ? (
        <p className="text-muted-foreground text-sm">Cargando calendario…</p>
      ) : view === "agenda" ? (
        // Listado del mes: una fila por día del periodo (sin relleno) con el
        // turno, festivos, horas y nota.
        <ul className="flex flex-col gap-2">
          {periodDays.map((day) => {
            // Datos de cada fila, buscados por fecha en los Map precalculados.
            const dateKey = format(day, "yyyy-MM-dd");
            const resolved = daysByDate.get(dateKey);
            const shift =
              resolved?.shiftTypeId !== undefined
                ? shiftsById.get(resolved.shiftTypeId)
                : undefined;
            const dayHolidays = holidaysByDate.get(dateKey) ?? [];
            const dayEntry = timeEntriesByDate.get(dateKey);
            const overtimeMinutes = dayEntry?.overtimeMinutes ?? 0;
            const actualMinutes = dayEntry ? actualMinutesOf(dayEntry) : 0;
            const note = overridesByDate.get(dateKey)?.notes;
            // Texto que leen los lectores de pantalla en lugar del contenido
            // visual del botón: fecha completa + nombre del turno o descanso.
            const accessibleLabel = `${format(day, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}, ${
              resolved?.kind === "shift" ? (shift?.name ?? "turno") : "descanso"
            }`;

            return (
              <li key={dateKey}>
                {/* `aria-current="date"` marca el día de hoy para tecnologías
                    de asistencia (solo se añade en esa fila). */}
                <button
                  type="button"
                  aria-pressed={selectedDate === dateKey}
                  aria-current={dateKey === todayKey ? "date" : undefined}
                  aria-label={accessibleLabel}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    "hover:border-ring focus-visible:ring-ring/50 flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 text-left transition focus-visible:ring-3 focus-visible:outline-none",
                    // Hoy: anillo de color primario.
                    dateKey === todayKey && "ring-primary ring-2",
                    // Día seleccionado: borde primario.
                    selectedDate === dateKey && "border-primary",
                  )}
                  // Mismo tratamiento de color que las celdas del grid.
                  style={
                    shift
                      ? {
                          borderColor: shift.color,
                          backgroundColor: `${shift.color}12`,
                        }
                      : undefined
                  }
                >
                  {/* Columna 1: día de la semana y número, con mes y año debajo */}
                  <span className="flex w-28 shrink-0 flex-col">
                    <span
                      className={cn(
                        "text-sm font-semibold capitalize",
                        dateKey === todayKey && "text-primary",
                      )}
                    >
                      {format(day, "EEEE d", { locale: es })}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {format(day, "MMM yyyy", { locale: es })}
                    </span>
                  </span>

                  {/* Columna 2 (flexible): turno o descanso, intervalos,
                      duración y nota de la excepción */}
                  <span className="flex min-w-40 flex-1 flex-col gap-0.5">
                    {resolved?.kind === "shift" ? (
                      <>
                        <span className="flex items-center gap-1 text-sm font-semibold">
                          {shift ? (
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: shift.color }}
                              aria-hidden
                            />
                          ) : null}
                          {shift?.name ?? "Turno"}
                          {resolved.source === "override" ? (
                            <span className="bg-foreground/10 rounded px-1 text-[10px] uppercase">
                              Cambio
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {resolved.intervals
                            .map(
                              (interval) => `${interval.start}–${interval.end}`,
                            )
                            .join(" · ")}{" "}
                          · {formatHours(resolved.plannedMinutes)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Descanso
                      </span>
                    )}
                    {note ? (
                      <span className="text-muted-foreground line-clamp-2 text-xs italic">
                        {note}
                      </span>
                    ) : null}
                  </span>

                  {/* Columna 3: etiquetas de festivos, horas reales y horas
                      extra del día, alineadas a la derecha */}
                  <span className="flex flex-wrap items-center justify-end gap-1.5 text-[11px]">
                    {dayHolidays.map((holiday) => (
                      <span
                        key={holiday._id}
                        className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300"
                      >
                        {holiday.name}
                      </span>
                    ))}
                    {actualMinutes > 0 ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                        Real {formatHours(actualMinutes)}
                      </span>
                    ) : null}
                    {overtimeMinutes > 0 ? (
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                        +{formatHours(overtimeMinutes)} extra
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        // Grid de celdas: 7 columnas en mes y semana, 1 columna en la vista
        // diaria (donde solo hay una celda, más grande). Los huecos y alturas
        // son menores en móvil y crecen desde el breakpoint `sm`.
        <div
          className={cn(
            "grid gap-0.5 sm:gap-1",
            view === "day" ? "grid-cols-1" : "grid-cols-7",
            view === "week" && "gap-1 sm:gap-2",
          )}
        >
          {gridDays.map((day) => {
            // Datos de cada celda, buscados por fecha en los Map precalculados.
            const dateKey = format(day, "yyyy-MM-dd");
            const resolved = daysByDate.get(dateKey);
            const shift =
              resolved?.shiftTypeId !== undefined
                ? shiftsById.get(resolved.shiftTypeId)
                : undefined;
            // Falso para los días de relleno de la vista mensual (mes
            // anterior/siguiente). En la vista semanal y en la diaria todos
            // los días pertenecen al periodo.
            const inPeriod =
              dateKey >= periodStartKey && dateKey <= periodEndKey;
            const dayHolidays = holidaysByDate.get(dateKey) ?? [];
            const dayEntry = timeEntriesByDate.get(dateKey);
            const overtimeMinutes = dayEntry?.overtimeMinutes ?? 0;
            const actualMinutes = dayEntry ? actualMinutesOf(dayEntry) : 0;
            // Texto que leen los lectores de pantalla en lugar del contenido
            // visual de la celda: fecha completa + nombre del turno o descanso.
            const accessibleLabel = `${format(day, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}, ${
              resolved?.kind === "shift" ? (shift?.name ?? "turno") : "descanso"
            }`;

            return (
              <button
                key={dateKey}
                type="button"
                aria-pressed={selectedDate === dateKey}
                aria-current={dateKey === todayKey ? "date" : undefined}
                aria-label={accessibleLabel}
                onClick={() => setSelectedDate(dateKey)}
                className={cn(
                  // Base compacta para móvil (`min-h-20`, `p-1.5`) que se
                  // amplía desde `sm`.
                  "hover:border-ring focus-visible:ring-ring/50 flex min-h-20 flex-col gap-1 rounded-lg border p-1.5 text-left transition focus-visible:ring-3 focus-visible:outline-none sm:min-h-28 sm:p-2",
                  // La vista semanal da más altura a cada día; la diaria, aún más.
                  view === "week" && "min-h-40 p-2 sm:min-h-56 sm:p-3",
                  view === "day" && "min-h-72 p-4",
                  // Los días de relleno se atenúan.
                  inPeriod ? "bg-card" : "bg-muted/30 text-muted-foreground",
                  // Hoy: anillo de color primario.
                  dateKey === todayKey && "ring-primary ring-2",
                  // Día seleccionado: borde primario.
                  selectedDate === dateKey && "border-primary",
                )}
                // Si hay turno, el borde y un fondo muy tenue (sufijo hex "12"
                // = ~7% de opacidad) toman el color del turno.
                style={
                  shift
                    ? {
                        borderColor: shift.color,
                        backgroundColor: `${shift.color}12`,
                      }
                    : undefined
                }
              >
                {/* Número del día + insignia "Cambio" si el turno viene de una excepción */}
                <span className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      dateKey === todayKey && "text-primary",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {resolved?.source === "override" ? (
                    <span className="bg-foreground/10 rounded px-1 text-[10px] uppercase">
                      Cambio
                    </span>
                  ) : null}
                </span>

                {/* Etiquetas de festivo (puede haber varias) */}
                {dayHolidays.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {dayHolidays.map((holiday) => (
                      <span
                        key={holiday._id}
                        className="rounded bg-amber-500/15 px-1 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                      >
                        {holiday.name}
                      </span>
                    ))}
                  </span>
                ) : null}

                {/* Horas reales trabajadas */}
                {actualMinutes > 0 ? (
                  <span className="self-start rounded bg-emerald-500/15 px-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    Real {formatHours(actualMinutes)}
                  </span>
                ) : null}

                {/* Horas extra (se indica si además es festivo) */}
                {overtimeMinutes > 0 ? (
                  <span className="self-start rounded bg-sky-500/15 px-1 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                    +{formatHours(overtimeMinutes)} extra
                    {dayHolidays.length > 0 ? " · festivo" : ""}
                  </span>
                ) : null}

                {/* Turno planificado (nombre, intervalos y horas) o "Descanso".
                    El nombre se trunca con puntos suspensivos si no cabe
                    (`min-w-0` + `truncate`) y el punto de color no se encoge. */}
                {resolved?.kind === "shift" ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1 text-xs font-semibold">
                      {shift ? (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: shift.color }}
                          aria-hidden
                        />
                      ) : null}
                      <span className="truncate">{shift?.name ?? "Turno"}</span>
                    </span>
                    {/* En móvil, el mes solo muestra el nombre del turno para
                        no saturar celdas de 7 columnas. */}
                    <span
                      className={cn(
                        "text-muted-foreground text-[11px]",
                        view === "month" && "hidden sm:block",
                      )}
                    >
                      {resolved.intervals
                        .map((interval) => `${interval.start}–${interval.end}`)
                        .join(" · ")}
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground text-[11px]",
                        view === "month" && "hidden sm:block",
                      )}
                    >
                      {formatHours(resolved.plannedMinutes)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Descanso
                  </span>
                )}

                {/* Nota de la excepción, limitada a 2 líneas */}
                {overridesByDate.get(dateKey)?.notes ? (
                  <span className="text-muted-foreground line-clamp-2 text-[11px] italic">
                    {overridesByDate.get(dateKey)?.notes}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------
          Leyenda: ayuda de uso + colores de turnos y tipos de hora
          ------------------------------------------------------------------ */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        <span>
          Pulsa un día para editar excepciones, horas reales, extra o festivos.
        </span>
        {/* Un punto de color por cada tipo de turno */}
        {(shifts ?? []).map((shift) => (
          <span key={shift._id} className="flex items-center gap-1">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: shift.color }}
              aria-hidden
            />
            {shift.name}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span
            className="border-muted-foreground/40 size-2.5 rounded-full border"
            aria-hidden
          />
          Descanso
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-amber-500/60" aria-hidden />
          Festivo
        </span>
        <span className="flex items-center gap-1">
          <span
            className="size-2.5 rounded-full bg-emerald-500/60"
            aria-hidden
          />
          Horas reales
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-sky-500/60" aria-hidden />
          Horas extra
        </span>
      </div>

      {/* Estado vacío: no hay tipos de turno o todo el rango son descansos.
          Invita a crear un patrón de turnos. */}
      {(shifts ?? []).length === 0 ||
      calendar?.days.every((day) => day.kind === "rest") ? (
        <p className="text-muted-foreground text-sm">
          Aún no hay turnos planificados.{" "}
          <Link className="underline" href="/patterns">
            Crea un patrón
          </Link>{" "}
          para verlo aquí.
        </p>
      ) : null}
    </div>
  );
}
