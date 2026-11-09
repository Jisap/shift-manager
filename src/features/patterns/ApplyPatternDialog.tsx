"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Calendar, Check, Loader2, Sparkles, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApplyPatternDialogProps = {
  pattern: Doc<"shiftPatterns">;
  defaultDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
};

export function ApplyPatternDialog({
  pattern,
  defaultDate,
  isOpen,
  onClose,
  onApplied,
}: ApplyPatternDialogProps) {
  // Calculamos por defecto el lunes más próximo o la fecha sugerida
  const [targetDate, setTargetDate] = useState(() => {
    if (defaultDate) return defaultDate;
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const applyPattern = useMutation(api.overrides.applyPatternToDate);

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await applyPattern({
        patternId: pattern._id,
        targetStartDate: targetDate,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onApplied) onApplied();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al aplicar el patrón en la fecha indicada"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-pattern-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Cerrar ventana"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 id="apply-pattern-title" className="text-base font-semibold leading-tight">
              Aplicar a fecha / semana
            </h3>
            <p className="text-xs text-muted-foreground">
              Proyecta «{pattern.name}» como turnos reales en el calendario
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1.5 border border-border/50">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Calendar className="size-3.5 text-primary" />
            <span>
              Ciclo de {pattern.cycleLength} días ({pattern.type === "weekly" ? "Semana estándar" : "Rotativo"})
            </span>
          </p>
          <p>
            Se generarán excepciones de calendario (overrides) para cada día a partir de la fecha seleccionada. Tu patrón base no se alterará.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 font-medium">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            <Check className="size-4" />
            <span>¡Turnos aplicados correctamente al calendario!</span>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetStartDate" className="text-xs font-semibold">
                Fecha de inicio (día 1 del ciclo)
              </Label>
              <Input
                id="targetStartDate"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full text-sm font-mono"
              />
              <span className="text-[11px] text-muted-foreground">
                Si es una semana completa, te recomendamos elegir el Lunes deseado.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !targetDate}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Aplicar turnos</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

