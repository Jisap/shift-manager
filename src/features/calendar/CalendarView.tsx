"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
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
import { DayOverrideEditor } from "./DayOverrideEditor";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Convierte minutos en texto legible: `"2 h"`, `"1 h 30 min"`, etc. */
function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function CalendarView() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // El grid de la vista mensual necesita días de la semana anterior/siguiente
  // para completar filas completas (lunes como primer día de semana).
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const startDate = format(gridStart, "yyyy-MM-dd");
  const endDate = format(gridEnd, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const calendar = useQuery(
    api.calendar.getRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  // `overrides` se carga en paralelo al calendario para poder leer notas
  // y el estado de excepción activa sin esperar a que el motor las resuelva.
  const overrides = useQuery(
    api.overrides.listRange,
    isAuthenticated ? { startDate, endDate } : "skip",
  );

  // Los datos de Convex llegan como arrays; los convertimos a Map para
  // acceso O(1) por id/fecha en el render del grid.
  const shiftsById = useMemo(
    () =>
      new Map((shifts ?? []).map((shift) => [String(shift._id), shift])),
    [shifts],
  );
  const daysByDate = useMemo(
    () => new Map((calendar?.days ?? []).map((day) => [day.date, day])),
    [calendar],
  );
  const overridesByDate = useMemo(
    () => new Map((overrides ?? []).map((override) => [override.date, override])),
    [overrides],
  );
  // La excepción del día seleccionado se pasa al editor para pre-rellenar el formulario.
  const selectedOverride =
    selectedDate === null ? undefined : overridesByDate.get(selectedDate);
  // Total de minutos planificados en el mes (excluye los días fuera del mes
  // que aparecen en el grid para completar semanas).
  const monthMinutes = (calendar?.days ?? [])
    .filter((day) => day.date >= monthStart && day.date <= monthEnd)
    .reduce((total, day) => total + day.plannedMinutes, 0);
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => setMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft />
          </Button>
          <h2 className="min-w-48 text-center text-lg font-semibold capitalize">
            {format(month, "MMMM 'de' yyyy", { locale: es })}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Hoy
          </Button>
        </div>
        <div className="text-muted-foreground text-sm">
          {calendar === undefined
            ? "Calculando…"
            : `${formatHours(monthMinutes)} previstas este mes`}
        </div>
      </div>

      {selectedDate ? (
        // La `key` incluye el id de la excepción (o "new") para que React
        // destruya y recree el editor al cambiar de día o al guardar/eliminar.
        <DayOverrideEditor
          key={`${selectedDate}-${selectedOverride?._id ?? "new"}`}
          date={selectedDate}
          shifts={shifts ?? []}
          existing={selectedOverride}
          onClose={() => setSelectedDate(null)}
        />
      ) : null}

      <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs font-medium">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1">
            {weekday}
          </div>
        ))}
      </div>

      {calendar === undefined ? (
        <p className="text-muted-foreground text-sm">Cargando calendario…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {gridDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const resolved = daysByDate.get(dateKey);
            const shift =
              resolved?.shiftTypeId !== undefined
                ? shiftsById.get(resolved.shiftTypeId)
                : undefined;
            const inMonth = isSameMonth(day, month);

            return (
              <button
                key={dateKey}
                type="button"
                aria-pressed={selectedDate === dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={cn(
                  "flex min-h-28 flex-col gap-1 rounded-lg border p-2 text-left transition hover:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                  inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                  dateKey === todayKey && "ring-primary ring-2",
                  selectedDate === dateKey && "border-primary",
                )}
                style={
                  shift
                    ? {
                        borderColor: shift.color,
                        backgroundColor: `${shift.color}12`,
                      }
                    : undefined
                }
              >
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

                {resolved?.kind === "shift" ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      {shift ? (
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: shift.color }}
                          aria-hidden
                        />
                      ) : null}
                      {shift?.name ?? "Turno"}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {resolved.intervals
                        .map((interval) => `${interval.start}–${interval.end}`)
                        .join(" · ")}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {formatHours(resolved.plannedMinutes)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Descanso
                  </span>
                )}

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

      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        <span>Pulsa un día para añadir o quitar una excepción.</span>
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
      </div>

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
