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

// Tramo horario local en formato "HH:mm".
type Interval = { start: string; end: string };

// Registro de horas reales ya guardado para el día (todo opcional porque el
// día puede tener solo horas extra, sin horas reales).
// `actualStart`/`actualEnd` son timestamps en milisegundos (instantes UTC).
type ExistingActual = {
  actualStart?: number;
  actualEnd?: number;
  breakMinutes?: number;
  expectedMinutes?: number;
  notes?: string;
};

type DayActualEditorProps = {
  /** Fecha del día, en formato "yyyy-MM-dd". */
  date: string;
  /** Zona horaria con la que se interpretan las horas locales. */
  timezone: string;
  /** Minutos que el motor tiene previstos para este día. */
  plannedMinutes: number;
  /** Turno asignado al día, si lo hay. */
  shiftTypeId?: Id<"shiftTypes">;
  /** Tramos del turno; el primero sirve de valor inicial del formulario. */
  shiftIntervals: Interval[];
  /** Registro existente, para pre-rellenar el formulario. */
  existing?: ExistingActual;
};

// Estilo compartido para los campos de hora, coherente con el resto de inputs.
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
  // Mutaciones de Convex para guardar y borrar las horas reales del día.
  const saveActual = useMutation(api.timeEntries.saveActual);
  const removeActual = useMutation(api.timeEntries.removeActual);

  // Valores iniciales: si ya hay un registro, sus instantes se convierten a
  // hora local; si no, se propone el primer tramo del turno (o vacío).
  // Se usa el inicializador perezoso de useState para calcularlo solo una vez.
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
  // Las pausas se guardan como texto para poder editar el input libremente
  // y se convierten a número más abajo (`parsedBreaks`).
  const [breakMinutes, setBreakMinutes] = useState(
    String(existing?.breakMinutes ?? 0),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ¿Hay ya horas reales guardadas? Controla si se muestra "Quitar".
  const hasSavedActual = existing?.actualStart !== undefined;
  const parsedBreaks = Number(breakMinutes);
  // Rango válido: ambas horas rellenas y distintas.
  const validRange = start !== "" && end !== "" && start !== end;
  // Minutos de presencia (entrada → salida), sin descontar pausas.
  const grossMinutes = validRange
    ? overtimeMinutesForIntervals(date, [{ start, end }], timezone)
    : 0;
  // Minutos trabajados netos (presencia − pausas).
  const netMinutes = validRange
    ? actualMinutesForInterval(date, start, end, parsedBreaks, timezone)
    : 0;
  // Si ya se guardó antes, se compara con la previsión de ese momento
  // (instantánea) y no con la actual, que podría haber cambiado.
  const plannedSnapshot = existing?.expectedMinutes ?? plannedMinutes;
  // Diferencia entre lo trabajado y lo previsto (negativa = menos de lo previsto).
  const differenceMinutes = netMinutes - plannedSnapshot;

  /**
   * Valida los campos en el cliente y, si todo es correcto, guarda las horas
   * reales. Los errores se muestran en el propio panel.
   */
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
        // Solo se guarda la previsión si el día tiene turno; así se puede
        // comparar más tarde previsto vs. real.
        expectedMinutes: shiftTypeId ? plannedMinutes : undefined,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron guardar las horas reales."),
      );
    } finally {
      // Se ejecuta tanto si hay éxito como si hay error.
      setIsSaving(false);
    }
  }

  /**
   * Elimina el registro de horas reales del día y deja el formulario vacío.
   */
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
        {/* Hora de entrada y de salida (hora local de la zona configurada) */}
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

        {/* Minutos de pausa a descontar del tiempo de presencia */}
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

        {/* Resumen en vivo: presencia, pausa, trabajadas y, si hay turno,
            diferencia respecto a lo previsto (con signo + o −) */}
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

        {/* Error de validación o del backend; `role="alert"` para lectores de pantalla */}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {/* Acciones: ambos botones se bloquean mientras hay una petición en curso.
            "Quitar" solo aparece si ya existen horas reales guardadas. */}
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