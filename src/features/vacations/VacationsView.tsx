"use client";

/**
 * VacationsView
 * ----------------------------------------------------------------------------
 * Gestión de vacaciones por año: saldo asignado, días utilizados, días
 * disponibles y registro de días concretos con una nota opcional.
 *
 * Los cálculos del saldo viven en `src/lib/calculations/vacations.ts` y la
 * validación real en Convex; este componente solo orquesta las queries y
 * presenta el resultado.
 */

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { convexErrorMessage } from "@/lib/utils/convex-error";
import { cn } from "@/lib/utils";

const MIN_YEAR = 1970;
const MAX_YEAR = 2100;
const MAX_ALLOCATED_DAYS = 366;

export function VacationsView() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [date, setDate] = useState(`${currentYear}-01-01`);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);

  const balance = useQuery(
    api.vacations.getBalance,
    isAuthenticated ? { year } : "skip",
  );
  const days = useQuery(
    api.vacations.listYear,
    isAuthenticated ? { year } : "skip",
  );
  const createDay = useMutation(api.vacations.create);
  const removeDay = useMutation(api.vacations.remove);
  const setAllocatedDays = useMutation(api.vacations.setAllocatedDays);

  /** Cambia de año y recoloca la fecha del formulario en el nuevo año. */
  function changeYear(nextYear: number) {
    if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) {
      return;
    }
    setYear(nextYear);
    setDate(`${nextYear}-01-01`);
    setError(null);
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavingDay(true);
    try {
      const trimmedNote = note.trim();
      await createDay({
        date,
        note: trimmedNote.length === 0 ? undefined : trimmedNote,
      });
      setNote("");
    } catch (caught) {
      setError(
        convexErrorMessage(
          caught,
          "No se pudo registrar el día de vacaciones.",
        ),
      );
    } finally {
      setSavingDay(false);
    }
  }

  async function handleRemove(id: Id<"vacations">) {
    setError(null);
    try {
      await removeDay({ id });
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudo eliminar el día de vacaciones."),
      );
    }
  }

  async function handleAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const field = event.currentTarget.elements.namedItem("allocated-days");
    if (!(field instanceof HTMLInputElement)) {
      return;
    }
    const allocatedDays = Number(field.value);
    if (
      !Number.isInteger(allocatedDays) ||
      allocatedDays < 0 ||
      allocatedDays > MAX_ALLOCATED_DAYS
    ) {
      setError(
        `Los días asignados deben ser un entero entre 0 y ${MAX_ALLOCATED_DAYS}.`,
      );
      return;
    }
    setSavingAllocation(true);
    try {
      await setAllocatedDays({ year, allocatedDays });
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo guardar el saldo."));
    } finally {
      setSavingAllocation(false);
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para gestionar tus vacaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/signin">Ir a iniciar sesión</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Selector de año y saldo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 p-0"
            aria-label="Año anterior"
            disabled={year <= MIN_YEAR}
            onClick={() => changeYear(year - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center text-lg font-semibold tracking-tight tabular-nums">
            {year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 p-0"
            aria-label="Año siguiente"
            disabled={year >= MAX_YEAR}
            onClick={() => changeYear(year + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <form
          onSubmit={handleAllocation}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="allocated-days" className="text-xs">
              Días asignados
            </Label>
            <Input
              key={`${year}-${balance?.allocatedDays ?? 0}`}
              id="allocated-days"
              name="allocated-days"
              type="number"
              min={0}
              max={MAX_ALLOCATED_DAYS}
              step={1}
              defaultValue={balance?.allocatedDays ?? 0}
              className="h-8 w-24"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={savingAllocation || balance === undefined}
          >
            Guardar saldo
          </Button>
        </form>
      </div>

      {/* Tarjetas de saldo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <BalanceCard
          label="Días asignados"
          value={balance?.allocatedDays}
          hint="Saldo anual definido manualmente"
        />
        <BalanceCard
          label="Días utilizados"
          value={balance?.usedDays}
          hint="Días registrados en el año"
        />
        <BalanceCard
          label="Días disponibles"
          value={balance?.remainingDays}
          hint="Asignados menos utilizados"
          tone={
            balance !== undefined && balance.remainingDays < 0
              ? "negative"
              : "default"
          }
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Registro de un día de vacaciones */}
      <Card className="border-border/70 rounded-2xl shadow-2xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="text-primary size-4" aria-hidden />
            Registrar un día
          </CardTitle>
          <CardDescription>
            Añade un día suelto de vacaciones en {year}. Los días ya registrados
            se muestran debajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="vacation-date" className="text-xs">
                Fecha
              </Label>
              <Input
                id="vacation-date"
                type="date"
                value={date}
                min={`${year}-01-01`}
                max={`${year}-12-31`}
                onChange={(event) => setDate(event.target.value)}
                required
                className="h-9 w-auto"
              />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Label htmlFor="vacation-note" className="text-xs">
                Nota (opcional)
              </Label>
              <Input
                id="vacation-note"
                value={note}
                maxLength={500}
                placeholder="Ej. Viaje familiar"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={savingDay}
            >
              <CalendarPlus className="size-4" aria-hidden />
              Añadir día
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Días registrados en el año */}
      <Card className="border-border/70 rounded-2xl shadow-2xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palmtree className="size-4 text-emerald-500" aria-hidden />
            Vacaciones de {year}
          </CardTitle>
          <CardDescription>
            {days === undefined
              ? "Cargando días…"
              : `${days.length} ${days.length === 1 ? "día registrado" : "días registrados"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {days === undefined ? (
            <p className="text-muted-foreground text-sm">Cargando…</p>
          ) : days.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Todavía no hay días de vacaciones en {year}.
            </p>
          ) : (
            <ul className="divide-border/60 divide-y">
              {days.map((day) => (
                <li
                  key={day._id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {format(parseISO(day.date), "EEEE d 'de' MMMM", {
                        locale: es,
                      })}
                    </p>
                    {day.note ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {day.note}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive gap-1.5"
                    onClick={() => void handleRemove(day._id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Tarjeta de saldo con etiqueta, valor grande y pista de cálculo. */
function BalanceCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | undefined;
  hint: string;
  tone?: "default" | "negative";
}) {
  return (
    <Card className="border-border/70 rounded-2xl shadow-2xs">
      <CardHeader className="gap-1">
        <CardDescription className="text-xs font-medium tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            tone === "negative" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value === undefined ? "—" : value}
        </CardTitle>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardHeader>
    </Card>
  );
}
