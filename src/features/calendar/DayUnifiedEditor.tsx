"use client";

import { useMutation } from "convex/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  Clock,
  Flame,
  Moon,
  PartyPopper,
  Save,
  Trash2,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatHours } from "@/lib/calculations/overtime";
import { cn } from "@/lib/utils";

type Interval = { start: string; end: string };

type ExistingOverride = Doc<"scheduleOverrides">;

type ExistingActual = {
  actualStart?: number;
  actualEnd?: number;
  breakMinutes?: number;
  expectedMinutes?: number;
  notes?: string;
  overtimeMinutes?: number;
  isHoliday?: boolean;
};

export type DayUnifiedEditorProps = {
  date: string;
  onClose: () => void;
  shifts: Doc<"shiftTypes">[];
  selectedOverride?: ExistingOverride | null;
  timezone: string;
  plannedMinutes: number;
  shiftTypeId?: Id<"shiftTypes">;
  shiftIntervals: Interval[];
  selectedOvertime?: ExistingActual;
  selectedShift?: Doc<"shiftTypes">;
  selectedHolidays: Doc<"holidays">[];
};

const OVERTIME_PRESETS = [0, 30, 60, 90, 120, 180]; // minutos

export function DayUnifiedEditor({
  date,
  onClose,
  shifts,
  selectedOverride,
  plannedMinutes,
  shiftTypeId: initialShiftTypeId,
  selectedOvertime,
  selectedShift,
  selectedHolidays,
}: DayUnifiedEditorProps) {
  const saveDayRecord = useMutation(api.timeEntries.saveDayRecord);
  const removeOverride = useMutation(api.overrides.remove);

  // 1. Estado del turno: "planned" (sin override), "shift" (override con turno), o "rest" (descanso)
  const [turnMode, setTurnMode] = useState<"planned" | "shift" | "rest">(() => {
    if (selectedOverride) {
      return selectedOverride.kind === "rest" ? "rest" : "shift";
    }
    return "planned";
  });

  const [activeShiftId, setActiveShiftId] = useState<Id<"shiftTypes"> | undefined>(() => {
    if (selectedOverride && selectedOverride.kind === "shift" && selectedOverride.shiftTypeId) {
      return selectedOverride.shiftTypeId;
    }
    return initialShiftTypeId;
  });

  // Turno efectivo seleccionado
  const currentShift = useMemo(() => {
    if (turnMode === "rest") return null;
    if (activeShiftId) {
      return shifts.find((s) => s._id === activeShiftId) ?? selectedShift ?? null;
    }
    return selectedShift ?? null;
  }, [turnMode, activeShiftId, shifts, selectedShift]);

  // Duración prevista del turno seleccionado (minutos)
  const effectivePlannedMinutes = useMemo(() => {
    if (turnMode === "rest") return 0;
    if (!currentShift) return plannedMinutes;
    // Si tiene turnos configurados, calculamos la jornada prevista neta
    const gross = currentShift.intervals.reduce((acc, it) => {
      const [sh = 0, sm = 0] = it.start.split(":").map(Number);
      const [eh = 0, em = 0] = it.end.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // cruce medianoche
      return acc + diff;
    }, 0);
    return Math.max(0, gross - (currentShift.breakMinutes ?? 0));
  }, [turnMode, currentShift, plannedMinutes]);

  // 2. Fichaje real: ¿Se trabajó el turno previsto o manual?
  const hasExistingActual = selectedOvertime?.actualStart !== undefined;
  const [worked, setWorked] = useState<boolean>(() => {
    if (hasExistingActual) return true;
    // Si hay un turno planificado y no es descanso, por defecto sugerimos confirmar
    return turnMode !== "rest";
  });

  const [confirmPlanned, setConfirmPlanned] = useState<boolean>(true);
  const [showCustomHours, setShowCustomHours] = useState<boolean>(false);
  const [customStart, setCustomStart] = useState<string>(() => {
    if (currentShift && currentShift.intervals.length > 0) {
      return currentShift.intervals[0].start;
    }
    return "08:00";
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    if (currentShift && currentShift.intervals.length > 0) {
      return currentShift.intervals[currentShift.intervals.length - 1].end;
    }
    return "16:00";
  });
  const [customBreak, setCustomBreak] = useState<number>(currentShift?.breakMinutes ?? 0);

  // 3. Horas extraordinarias
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(
    selectedOvertime?.overtimeMinutes ?? 0,
  );
  const [customOvertimeInput, setCustomOvertimeInput] = useState<string>("");

  // 4. Festivo
  const [isHoliday, setIsHoliday] = useState<boolean>(selectedHolidays.length > 0);
  const [holidayName, setHolidayName] = useState<string>(
    selectedHolidays[0]?.name ?? "Festivo",
  );

  // 5. Notas
  const [notes, setNotes] = useState<string>(
    selectedOvertime?.notes ?? selectedOverride?.notes ?? "",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cálculos totales en vivo
  const totalRealMinutes = useMemo(() => {
    if (!worked) return 0;
    let base = 0;
    if (confirmPlanned) {
      base = effectivePlannedMinutes;
    } else {
      const [sh = 0, sm = 0] = customStart.split(":").map(Number);
      const [eh = 0, em = 0] = customEnd.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      base = Math.max(0, diff - customBreak);
    }
    return base + overtimeMinutes;
  }, [worked, confirmPlanned, effectivePlannedMinutes, customStart, customEnd, customBreak, overtimeMinutes]);

  const differenceMinutes = totalRealMinutes - effectivePlannedMinutes;

  async function handleSave() {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      let overrideKindArg: "shift" | "rest" | undefined;
      if (turnMode === "rest") {
        overrideKindArg = "rest";
      } else if (turnMode === "shift") {
        overrideKindArg = "shift";
      }

      await saveDayRecord({
        date,
        overrideKind: overrideKindArg,
        shiftTypeId: activeShiftId,
        worked,
        confirmPlanned: worked && confirmPlanned,
        customStart: !confirmPlanned ? customStart : undefined,
        customEnd: !confirmPlanned ? customEnd : undefined,
        customBreakMinutes: !confirmPlanned ? customBreak : undefined,
        overtimeMinutes,
        isHoliday,
        holidayName: isHoliday ? holidayName : undefined,
        notes: notes.trim() || undefined,
      });

      setStatusMessage({ type: "success", text: "Jornada guardada correctamente" });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch {
      setStatusMessage({ type: "error", text: "Error al guardar los datos del día" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestorePattern() {
    if (!selectedOverride) return;
    setIsSubmitting(true);
    try {
      await removeOverride({ id: selectedOverride._id });
      setTurnMode("planned");
      setStatusMessage({ type: "success", text: "Patrón restaurado" });
    } catch {
      setStatusMessage({ type: "error", text: "No se pudo restaurar el patrón" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isHolidayToggleId = useId();
  const formattedDate = format(parseISO(date), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Encabezado de la jornada ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Jornada diaria
          </span>
          <h4 className="text-lg font-bold capitalize text-foreground">
            {formattedDate}
          </h4>
        </div>
        {selectedOverride ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestorePattern}
            disabled={isSubmitting}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Quita la excepción y vuelve al turno programado por el patrón"
          >
            <Trash2 className="size-3.5 text-rose-500" />
            <span>Restaurar al patrón</span>
          </Button>
        ) : null}
      </div>

      {statusMessage ? (
        <div
          className={cn(
            "rounded-xl p-3 text-xs font-medium animate-in fade-in-0 duration-150",
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20",
          )}
        >
          {statusMessage.text}
        </div>
      ) : null}

      {/* ─── BLOQUE 1: TURNO / ESTADO ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1. Turno de trabajo
          </Label>
          <span className="text-xs text-muted-foreground">
            Previsto: <strong className="text-foreground">{formatHours(effectivePlannedMinutes)}</strong>
          </span>
        </div>

        {/* Chips de selección de turno rápido */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shifts.map((shift) => {
            const isSelected = turnMode !== "rest" && activeShiftId === shift._id;
            return (
              <button
                key={shift._id}
                type="button"
                onClick={() => {
                  setTurnMode("shift");
                  setActiveShiftId(shift._id);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all shadow-2xs",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/30"
                    : "border-border/80 bg-card hover:border-primary/40 text-foreground",
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: shift.color }}
                />
                <span className="truncate">{shift.name}</span>
                {isSelected ? <Check className="ml-auto size-3.5 text-primary" /> : null}
              </button>
            );
          })}

          {/* Opción de descanso */}
          <button
            type="button"
            onClick={() => {
              setTurnMode("rest");
              setWorked(false);
              setOvertimeMinutes(0);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all shadow-2xs",
              turnMode === "rest"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold ring-2 ring-sky-500/30"
                : "border-border/80 bg-card hover:border-sky-500/40 text-foreground",
            )}
          >
            <Moon className="size-3 shrink-0 text-sky-500" />
            <span className="truncate">Descanso</span>
            {turnMode === "rest" ? <Check className="ml-auto size-3.5 text-sky-500" /> : null}
          </button>
        </div>
      </div>

      {/* ─── BLOQUE 2: JORNADA TRABAJADA (FICHAJE) ────────────────────────────── */}
      {turnMode !== "rest" ? (
        <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              <span>2. Fichaje y jornada real</span>
            </Label>
            <span className="text-xs font-medium text-foreground">
              {worked ? formatHours(totalRealMinutes - overtimeMinutes) : "0 h"}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Botón grande: Confirmar jornada prevista (1 clic) */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={worked && confirmPlanned ? "default" : "outline"}
                className={cn(
                  "h-11 flex-1 justify-start gap-2.5 rounded-xl px-4 text-xs font-semibold shadow-2xs",
                  worked && confirmPlanned && "bg-primary text-primary-foreground",
                )}
                onClick={() => {
                  setWorked(true);
                  setConfirmPlanned(true);
                  setShowCustomHours(false);
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-white/20">
                  <Check className="size-3.5" />
                </div>
                <span>Cumplí mi turno completo ({formatHours(effectivePlannedMinutes)})</span>
              </Button>

              <Button
                type="button"
                variant={!worked ? "secondary" : "ghost"}
                size="sm"
                className="h-11 rounded-xl text-xs text-muted-foreground"
                onClick={() => {
                  setWorked(false);
                  setOvertimeMinutes(0);
                }}
              >
                No trabajado
              </Button>
            </div>

            {/* Alternativa: Personalizar horario si entró antes o salió después */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCustomHours(!showCustomHours);
                  if (!showCustomHours) {
                    setWorked(true);
                    setConfirmPlanned(false);
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 font-medium transition-colors"
              >
                <span>{showCustomHours ? "Ocultar horario manual" : "¿Hiciste un horario diferente? Configurar entrada/salida"}</span>
              </button>

              {showCustomHours ? (
                <div className="mt-3 grid grid-cols-3 gap-2.5 rounded-xl border border-border/80 bg-card p-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                  <div>
                    <Label htmlFor="unified-custom-start" className="text-[11px] text-muted-foreground">Entrada</Label>
                    <Input
                      id="unified-custom-start"
                      type="time"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unified-custom-end" className="text-[11px] text-muted-foreground">Salida</Label>
                    <Input
                      id="unified-custom-end"
                      type="time"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unified-custom-break" className="text-[11px] text-muted-foreground">Pausa (min)</Label>
                    <Input
                      id="unified-custom-break"
                      type="number"
                      min={0}
                      step={5}
                      value={customBreak}
                      onChange={(e) => setCustomBreak(Math.max(0, Number(e.target.value)))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── BLOQUE 3: HORAS EXTRAORDINARIAS ──────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="size-3.5 text-amber-500" />
            <span>3. Horas extraordinarias</span>
          </Label>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {overtimeMinutes > 0 ? `+${formatHours(overtimeMinutes)} extra` : "Ninguna"}
          </span>
        </div>

        {/* Chips de selección rápida de horas extra */}
        <div className="flex flex-wrap items-center gap-1.5">
          {OVERTIME_PRESETS.map((minutes) => {
            const isSelected = overtimeMinutes === minutes;
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => setOvertimeMinutes(minutes)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all shadow-2xs",
                  isSelected
                    ? "bg-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/40"
                    : "border border-border/70 bg-card text-foreground hover:border-amber-500/50",
                )}
              >
                {minutes === 0 ? "0 h" : `+${formatHours(minutes)}`}
              </button>
            );
          })}

          <div className="flex items-center gap-1 ml-auto">
            <Input
              type="number"
              min={0}
              step={15}
              placeholder="Otro (min)"
              value={customOvertimeInput}
              onChange={(e) => {
                setCustomOvertimeInput(e.target.value);
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  setOvertimeMinutes(val);
                }
              }}
              className="h-7 w-24 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* ─── BLOQUE 4: FESTIVO Y NOTAS (OPCIONALES) ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <label htmlFor={isHolidayToggleId} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <PartyPopper className="size-4 text-rose-500" />
            <span>Marcar este día como festivo</span>
          </label>
          <input
            id={isHolidayToggleId}
            type="checkbox"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            className="size-4 rounded accent-primary cursor-pointer"
          />
        </div>

        {isHoliday ? (
          <Input
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            placeholder="Nombre del festivo (ej. Navidad, Local...)"
            className="h-8 text-xs animate-in fade-in-0 duration-150"
          />
        ) : null}

        <div className="pt-1">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Añadir nota breve para este día (opcional)..."
            className="h-8 text-xs text-muted-foreground"
          />
        </div>
      </div>

      {/* ─── RESUMEN TOTAL DEL DÍA Y ACCIÓN GUARDAR ───────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total trabajado hoy:</span>
          <span className="font-bold text-foreground text-sm">
            {formatHours(totalRealMinutes)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs border-t border-primary/10 pt-2">
          <span className="text-muted-foreground">Diferencia vs jornada prevista:</span>
          <span
            className={cn(
              "font-semibold text-xs",
              differenceMinutes > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : differenceMinutes < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground",
            )}
          >
            {differenceMinutes === 0
              ? "0 h"
              : `${differenceMinutes > 0 ? "+" : "−"}${formatHours(Math.abs(differenceMinutes))}`}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-3 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-9 gap-1.5 px-5 text-xs font-semibold shadow-sm"
          >
            <Save className="size-3.5" />
            <span>Guardar jornada</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

