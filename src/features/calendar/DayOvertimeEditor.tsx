"use client";

import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
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
  formatHours,
  localIntervalMinutes,
} from "@/lib/calculations/overtime";
import { convexErrorMessage } from "@/lib/utils/convex-error";

type Interval = { start: string; end: string };

type ExistingOvertime = {
  overtimeIntervals?: Interval[];
  overtimeMinutes?: number;
  notes?: string;
};

type DayOvertimeEditorProps = {
  date: string;
  isHoliday: boolean;
  shiftTypeId?: Id<"shiftTypes">;
  shiftName?: string;
  shiftIntervals: Interval[];
  existing?: ExistingOvertime;
};

const timeClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * Panel para declarar horas extra sobre el turno planificado.
 * El usuario decide si hubo extra y define los tramos con su horario.
 */
export function DayOvertimeEditor({
  date,
  isHoliday,
  shiftTypeId,
  shiftName,
  shiftIntervals,
  existing,
}: DayOvertimeEditorProps) {
  const saveOvertime = useMutation(api.timeEntries.saveOvertime);
  const removeOvertime = useMutation(api.timeEntries.removeOvertime);

  const [enabled, setEnabled] = useState(
    (existing?.overtimeIntervals?.length ?? 0) > 0,
  );
  const [intervals, setIntervals] = useState<Interval[]>(
    existing?.overtimeIntervals?.length
      ? existing.overtimeIntervals
      : [{ start: "", end: "" }],
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalMinutes = intervals.reduce(
    (total, interval) => total + localIntervalMinutes(interval),
    0,
  );
  const hasSavedOvertime = (existing?.overtimeIntervals?.length ?? 0) > 0;

  function updateInterval(index: number, field: keyof Interval, value: string) {
    setIntervals((current) =>
      current.map((interval, currentIndex) =>
        currentIndex === index ? { ...interval, [field]: value } : interval,
      ),
    );
  }

  function addInterval() {
    setIntervals((current) => [...current, { start: "", end: "" }]);
  }

  function removeInterval(index: number) {
    setIntervals((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [{ start: "", end: "" }];
    });
  }

  async function save() {
    setError(null);
    const cleaned = intervals.filter(
      (interval) => interval.start && interval.end,
    );
    if (cleaned.length === 0) {
      setError("Indica al menos un tramo con hora de inicio y fin.");
      return;
    }
    if (cleaned.some((interval) => interval.start === interval.end)) {
      setError("La entrada y la salida de un tramo no pueden coincidir.");
      return;
    }

    setIsSaving(true);
    try {
      await saveOvertime({
        date,
        shiftTypeId,
        intervals: cleaned,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron guardar las horas extra."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    setError(null);
    setIsSaving(true);
    try {
      await removeOvertime({ date });
      setEnabled(false);
      setIntervals([{ start: "", end: "" }]);
      setNotes("");
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron quitar las horas extra."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas extra</CardTitle>
        <CardDescription>
          {shiftName
            ? `Sobre el turno planificado: ${shiftName}.`
            : "No hay un turno planificado para este día."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {shiftIntervals.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            Horario del turno:{" "}
            {shiftIntervals
              .map((interval) => `${interval.start}–${interval.end}`)
              .join(" · ")}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            id="overtime-enabled"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <Label htmlFor="overtime-enabled">
            He realizado horas extra sobre este turno
          </Label>
        </div>

        {enabled ? (
          <>
            {isHoliday ? (
              <p className="text-muted-foreground text-xs">
                Este día es festivo: las horas se contabilizarán como
                festivo-extra.
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label>Tramos de horas extra</Label>
              {intervals.map((interval, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Input
                    aria-label={`Inicio del tramo ${index + 1}`}
                    type="time"
                    className={timeClassName}
                    value={interval.start}
                    onChange={(event) =>
                      updateInterval(index, "start", event.target.value)
                    }
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    aria-label={`Fin del tramo ${index + 1}`}
                    type="time"
                    className={timeClassName}
                    value={interval.end}
                    onChange={(event) =>
                      updateInterval(index, "end", event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar tramo ${index + 1}`}
                    onClick={() => removeInterval(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={addInterval}
                disabled={intervals.length >= 4}
              >
                <Plus /> Añadir tramo
              </Button>
              <p className="text-muted-foreground text-xs">
                Total declarado: {formatHours(totalMinutes)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="overtime-notes">Notas (opcional)</Label>
              <Input
                id="overtime-notes"
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
                Guardar horas extra
              </Button>
              {hasSavedOvertime ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void remove()}
                  disabled={isSaving}
                >
                  Quitar horas extra
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {hasSavedOvertime ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  Declaradas {formatHours(existing?.overtimeMinutes ?? 0)}.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="self-start"
                  onClick={() => void remove()}
                  disabled={isSaving}
                >
                  Quitar horas extra
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Sin horas extra declaradas.
              </p>
            )}
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
