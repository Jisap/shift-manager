"use client";

import { useEffect } from "react";
import {
  ChevronRight,
  Edit3,
  Moon,
  RotateCcw,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DayQuickActionsSheetProps = {
  date: string | null;
  onClose: () => void;
  onOpenFullEditor: () => void;
  shifts: Doc<"shiftTypes">[];
  currentShift?: Doc<"shiftTypes">;
  hasOverride: boolean;
  overrideId?: Id<"scheduleOverrides">;
  plannedMinutes: number;
  isRest: boolean;
  isHoliday: boolean;
  holidayNames?: string[];
};

export function DayQuickActionsSheet({
  date,
  onClose,
  onOpenFullEditor,
  shifts,
  currentShift,
  hasOverride,
  overrideId,
  plannedMinutes,
  isRest,
  isHoliday,
  holidayNames = [],
}: DayQuickActionsSheetProps) {
  const setDayRestMutation = useMutation(api.overrides.setDayRest);
  const setDayShiftMutation = useMutation(api.overrides.setDayShift);
  const removeOverrideMutation = useMutation(api.overrides.remove);

  // Bloquear scroll de fondo mientras el sheet está abierto
  useEffect(() => {
    if (!date) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [date]);

  if (!date) return null;

  const parsedDate = parseISO(date);
  const formattedDay = format(parsedDate, "EEEE d 'de' MMMM", { locale: es });

  const handleSetRest = async () => {
    try {
      await setDayRestMutation({ date });
      onClose();
    } catch {
      // Manejado por reactividad
    }
  };

  const handleRestorePattern = async () => {
    if (!overrideId) return;
    try {
      await removeOverrideMutation({ id: overrideId });
      onClose();
    } catch {
      // Manejado por reactividad
    }
  };

  const handleQuickShift = async (shiftId: Id<"shiftTypes">) => {
    try {
      await setDayShiftMutation({
        date,
        shiftTypeId: shiftId,
      });
      onClose();
    } catch {
      // Manejado por reactividad
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Acciones rápidas para ${formattedDay}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in-0 sm:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-8 shadow-2xl transition-transform duration-200 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de arrastre */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted-foreground/30" />

        {/* Cabecera del día */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Gestión rápida
            </span>
            <h3 className="text-base font-bold capitalize text-foreground">
              {formattedDay}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {isRest ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Moon className="size-3" /> Descanso
                </span>
              ) : currentShift ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${currentShift.color}20`,
                    color: currentShift.color,
                  }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: currentShift.color }}
                  />
                  {currentShift.name} ({Math.round(plannedMinutes / 60)}h)
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Sin turno</span>
              )}

              {hasOverride && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  Modificado
                </span>
              )}

              {isHoliday && holidayNames.length > 0 && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {holidayNames[0]}
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0 rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Acciones principales en botones grandes para el pulgar */}
        <div className="space-y-2.5 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isRest ? "secondary" : "outline"}
              className="h-12 justify-start gap-2.5 rounded-xl px-3.5 text-xs font-semibold"
              onClick={handleSetRest}
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <Moon className="size-4" />
              </div>
              <span className="truncate">Poner en descanso</span>
            </Button>

            {hasOverride && overrideId ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 justify-start gap-2.5 rounded-xl px-3.5 text-xs font-semibold"
                onClick={handleRestorePattern}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <RotateCcw className="size-4" />
                </div>
                <span className="truncate">Restaurar patrón</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 justify-start gap-2.5 rounded-xl px-3.5 text-xs font-semibold"
                onClick={() => {
                  onClose();
                  onOpenFullEditor();
                }}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Edit3 className="size-4" />
                </div>
                <span className="truncate">Editar fichaje/extra</span>
              </Button>
            )}
          </div>

          {/* Asignación táctil directa de turno */}
          {shifts.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase px-1">
                Asignar turno en 1 toque:
              </span>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {shifts.map((s) => {
                  const isCurrent = currentShift?._id === s._id;
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => handleQuickShift(s._id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all text-left",
                        isCurrent
                          ? "border-primary bg-primary/5 font-semibold text-primary"
                          : "border-border/70 bg-card hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="size-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-medium text-sm">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                        <span>
                          {s.intervals.map((i) => `${i.start}–${i.end}`).join(", ")}
                        </span>
                        <ChevronRight className="size-3.5 text-muted-foreground/60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botón para abrir el panel completo con pestañas si necesita editar horas reales o extras */}
          {hasOverride && overrideId && (
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClose();
                  onOpenFullEditor();
                }}
              >
                <Edit3 className="size-3.5" />
                <span>Abrir editor completo (fichaje real, horas extra, notas)</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

