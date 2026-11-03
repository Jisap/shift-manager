"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
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
import {
  actualMinutesForInterval,
  formatHours,
  overtimeMinutesForIntervals,
} from "@/lib/calculations/overtime";
import { instantToLocalTime } from "@/lib/dates/local-date";
import { convexErrorMessage } from "@/lib/utils/convex-error";

type Interval = { start: string; end: string };

type ExistingActual = {
  actualStart?: number;
  actualEnd?: number;
  breakMinutes?: number;
  expectedMinutes?: number;
  notes?: string;
};

type DayActualEditorProps = {
  date: string;
  timezone: string;
  plannedMinutes: number;
  shiftTypeId?: Id<"shiftTypes">;
  shiftIntervals: Interval[];
  existing?: ExistingActual;
};

const timeClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * Panel para registrar las horas realmente trabajadas de un día.
 * Guarda entrada y salida locales junto con las pausas y una instantánea
 * de los minutos previstos para poder comparar previsto y real.
 */
export function DayActualEditor({
  date,
  timezone,
  plannedMinutes,
  shiftTypeId,
  shiftIntervals,
  existing,
}: DayActualEditorProps) {
  const saveActual = useMutation(api.timeEntries.saveActual);
  const removeActual = useMutation(api.timeEntries.removeActual);

  const defaultInterval = shiftIntervals[0];
  const [start, setStart] = useState(() =>
    existing?.actualStart !== undefined
      ? instantToLocalTime(existing.actualStart, timezone)
      : (defaultInterval?.start ?? ""),
  );
  const [end, setEnd] = useState(() =>
    existing?.actualEnd !== undefined
      ? instantToLocalTime(existing.actualEnd, timezone)
      : (defaultInterval?.end ?? ""),
  );
  const [breakMinutes, setBreakMinutes] = useState(
    String(existing?.breakMinutes ?? 0),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasSavedActual = existing?.actualStart !== undefined;
  const parsedBreaks = Number(breakMinutes);
  const validRange = start !== "" && end !== "" && start !== end;
  const grossMinutes = validRange
    ? overtimeMinutesForIntervals(date, [{ start, end }], timezone)
    : 0;
  const netMinutes = validRange
    ? actualMinutesForInterval(date, start, end, parsedBreaks, timezone)
    : 0;
  const plannedSnapshot = existing?.expectedMinutes ?? plannedMinutes;
  const differenceMinutes = netMinutes - plannedSnapshot;

  async function save() {
    setError(null);
    if (!start || !end) {
      setError("Indica la hora de entrada y de salida.");
      return;
    }
    if (start === end) {
      setError("La entrada y la salida no pueden coincidir.");
      return;
    }
    if (!Number.isInteger(parsedBreaks) || parsedBreaks < 0) {
      setError("Las pausas deben ser minutos enteros positivos.");
      return;
    }
    if (parsedBreaks > grossMinutes) {
      setError(
        "Las pausas no pueden superar el tiempo entre entrada y salida.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await saveActual({
        date,
        start,
        end,
        breakMinutes: parsedBreaks,
        shiftTypeId,
        expectedMinutes: shiftTypeId ? plannedMinutes : undefined,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron guardar las horas reales."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    setError(null);
    setIsSaving(true);
    try {
      await removeActual({ date });
      setStart("");
      setEnd("");
      setBreakMinutes("0");
      setNotes("");
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron quitar las horas reales."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas reales</CardTitle>
        <CardDescription>
          Registra la entrada, la salida y las pausas de este día.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="actual-start">Entrada</Label>
            <Input
              id="actual-start"
              type="time"
              className={timeClassName}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="actual-end">Salida</Label>
            <Input
              id="actual-end"
              type="time"
              className={timeClassName}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="actual-breaks">Pausas (min)</Label>
          <Input
            id="actual-breaks"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
        </div>

        {validRange ? (
          <p className="text-muted-foreground text-xs">
            {formatHours(grossMinutes)} de presencia ·{" "}
            {formatHours(Math.max(0, parsedBreaks))} de pausa ·{" "}
            {formatHours(netMinutes)} trabajadas
            {shiftTypeId
              ? ` · ${differenceMinutes >= 0 ? "+" : "−"}${formatHours(
                  Math.abs(differenceMinutes),
                )} respecto a lo previsto`
              : ""}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="actual-notes">Notas (opcional)</Label>
          <Input
            id="actual-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={isSaving}
          >
            Guardar horas reales
          </Button>
          {hasSavedActual ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void remove()}
              disabled={isSaving}
            >
              Quitar horas reales
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
