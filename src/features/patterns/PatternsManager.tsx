"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Archive,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Layers,
  Pencil,
  RotateCw,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
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
import { cn } from "@/lib/utils";
import { weekdayOf } from "@/lib/dates/local-date";
import { convexErrorMessage } from "@/lib/utils/convex-error";
import {
  defaultPatternValues,
  nextMondayLocalDate,
  patternFormSchema,
  WEEKLY_DAY_LABELS,
  type PatternFormValues,
} from "@/lib/validators/pattern";
import { ApplyPatternDialog } from "./ApplyPatternDialog";

export function PatternsManager() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const patterns = useQuery(api.patterns.list, isAuthenticated ? {} : "skip");
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  const createPattern = useMutation(api.patterns.create);
  const updatePattern = useMutation(api.patterns.update);
  const renamePattern = useMutation(api.patterns.rename);
  const archivePattern = useMutation(api.patterns.archive);
  const removePattern = useMutation(api.patterns.remove);

  const [editingId, setEditingId] = useState<Id<"shiftPatterns"> | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"shiftPatterns"> | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Selector de patrón activo para ver en detalle
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [patternToApply, setPatternToApply] = useState<Doc<"shiftPatterns"> | null>(null);
  // Control de formulario visible en móvil
  const [isFormOpenMobile, setIsFormOpenMobile] = useState(false);

  const form = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: defaultPatternValues(),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const cycleLength = useWatch({ control: form.control, name: "cycleLength" });
  const days = useWatch({ control: form.control, name: "days" });

  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [shift._id as string, shift])),
    [shifts],
  );

  // Ordenar patrones por fecha de inicio descendente
  const sortedPatterns = useMemo(() => {
    if (!patterns) return [];
    return [...patterns].sort((left, right) =>
      right.startDate.localeCompare(left.startDate),
    );
  }, [patterns]);

  // Patrón activo seleccionado para ver en detalle (por defecto el más reciente)
  const activePattern = useMemo(() => {
    if (sortedPatterns.length === 0) return null;
    if (selectedPatternId) {
      return sortedPatterns.find((p) => p._id === selectedPatternId) ?? sortedPatterns[0];
    }
    return sortedPatterns[0];
  }, [sortedPatterns, selectedPatternId]);

  useEffect(() => {
    const target = type === "weekly" ? 7 : cycleLength;
    const current = form.getValues("days");
    if (!Number.isFinite(target) || target < 1 || current.length === target) {
      return;
    }
    const next =
      target > current.length
        ? [
            ...current,
            ...Array.from({ length: target - current.length }, (_, index) => ({
              dayIndex: current.length + index,
              isRestDay: true,
              shiftTypeId: undefined,
            })),
          ]
        : current.slice(0, target);
    form.setValue("days", next, { shouldDirty: true });
  }, [type, cycleLength, form]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
        <Clock className="size-4 animate-spin" />
        <span>Cargando patrones…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md rounded-2xl shadow-2xs">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para gestionar tus patrones.
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

  function resetForm() {
    setEditingId(null);
    setError(null);
    form.reset(defaultPatternValues());
  }

  function handleTypeChange(nextType: "weekly" | "rotating") {
    form.setValue("type", nextType, { shouldValidate: true });
    if (nextType === "weekly") {
      form.setValue("cycleLength", 7, { shouldValidate: true });
      if (weekdayOf(form.getValues("anchorDate")) !== 1) {
        form.setValue("anchorDate", nextMondayLocalDate(), {
          shouldValidate: true,
        });
      }
    }
  }

  function updateDay(index: number, value: string) {
    const isRest = value === "__rest";
    form.setValue(
      `days.${index}.isRestDay`,
      isRest,
      { shouldDirty: true, shouldValidate: true },
    );
    form.setValue(
      `days.${index}.shiftTypeId`,
      isRest ? undefined : (value as Id<"shiftTypes">),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function onSubmit(values: PatternFormValues) {
    setError(null);
    const payload = {
      name: values.name.trim(),
      type: values.type,
      cycleLength: values.type === "weekly" ? 7 : values.cycleLength,
      anchorDate: values.anchorDate,
      startDate: values.startDate,
      endDate: values.endDate?.trim() ? values.endDate.trim() : undefined,
      days: values.days.map((day) => ({
        dayIndex: day.dayIndex,
        isRestDay: day.isRestDay,
        shiftTypeId: day.isRestDay ? undefined : (day.shiftTypeId as Id<"shiftTypes"> | undefined),
      })),
    };

    try {
      if (editingId) {
        await updatePattern({ id: editingId, ...payload });
      } else {
        await createPattern(payload);
      }
      setIsFormOpenMobile(false);
      resetForm();
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo guardar el patrón."));
    }
  }

  function startEditing(pattern: NonNullable<typeof patterns>[number]) {
    setEditingId(pattern._id);
    setIsFormOpenMobile(true);
    setError(null);
    form.reset({
      name: pattern.name,
      type: pattern.type,
      cycleLength: pattern.cycleLength,
      anchorDate: pattern.anchorDate,
      startDate: pattern.startDate,
      endDate: pattern.endDate ?? "",
      days: pattern.days.map((day) => ({
        dayIndex: day.dayIndex,
        isRestDay: day.isRestDay,
        shiftTypeId: day.shiftTypeId,
      })),
    });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("pattern-form-card")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function submitRename(id: Id<"shiftPatterns">) {
    setError(null);
    try {
      await renamePattern({ id, name: renameValue });
      setRenamingId(null);
      setRenameValue("");
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo renombrar el patrón."));
    }
  }

  async function archive(id: Id<"shiftPatterns">) {
    setError(null);
    try {
      await archivePattern({ id });
      if (editingId === id) {
        resetForm();
      }
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo archivar el patrón."));
    }
  }

  async function remove(id: Id<"shiftPatterns">) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este patrón por completo?")) {
      return;
    }
    setError(null);
    try {
      await removePattern({ id });
      if (editingId === id) {
        resetForm();
      }
      if (selectedPatternId === id) {
        setSelectedPatternId(null);
      }
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo eliminar el patrón."));
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[25rem_1fr] lg:items-start">
      {/* Formulario lateral de configuración */}
      <Card
        id="pattern-form-card"
        className={cn(
          "border-border/80 rounded-2xl shadow-2xs overflow-hidden lg:sticky lg:top-20 order-2 lg:order-1 transition-all",
          !isFormOpenMobile && !editingId && "hidden lg:block"
        )}
      >
        {/* Barra de contexto sticky en móvil: informa al usuario del modo activo */}
        <div className="bg-muted/60 border-b border-border/60 flex items-center justify-between gap-3 px-4 py-2.5 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <RotateCw className="size-3.5" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {editingId ? "Editar patrón" : "Nuevo patrón de turnos"}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar formulario"
            onClick={() => {
              setIsFormOpenMobile(false);
              resetForm();
            }}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-xs">
              <RotateCw className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {editingId ? "Editar patrón" : "Nuevo patrón de turnos"}
              </CardTitle>
              <CardDescription className="text-xs">
                Define el ciclo semanal o rotativo y proyecta tus turnos automáticamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pattern-name" className="text-xs font-semibold">
                Nombre del patrón
              </Label>
              <Input
                id="pattern-name"
                placeholder="Ej. Ciclo 6-2, Turno M-T-N..."
                className="h-9"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            {/* Selector de Tipo (Semanal vs Rotativo) */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Tipo de ciclo</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("weekly")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-all select-none",
                    type === "weekly"
                      ? "border-primary bg-primary/5 text-primary shadow-2xs font-semibold"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <CalendarDays className="size-4" />
                  <span>Semanal (7 días)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("rotating")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-all select-none",
                    type === "rotating"
                      ? "border-primary bg-primary/5 text-primary shadow-2xs font-semibold"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <RotateCw className="size-4" />
                  <span>Rotativo libre</span>
                </button>
              </div>
            </div>

            {type === "rotating" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pattern-cycle" className="text-xs font-semibold">
                  Duración del ciclo (días)
                </Label>
                <Input
                  id="pattern-cycle"
                  type="number"
                  min={1}
                  max={365}
                  className="h-9 font-medium"
                  {...form.register("cycleLength", { valueAsNumber: true })}
                />
                {form.formState.errors.cycleLength ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.cycleLength.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pattern-anchor" className="text-xs font-semibold">
                {type === "weekly" ? "Lunes de referencia" : "Día 0 del ciclo"}
              </Label>
              <Input
                id="pattern-anchor"
                type="date"
                className="h-9"
                {...form.register("anchorDate")}
              />
              {form.formState.errors.anchorDate ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.anchorDate.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pattern-start" className="text-xs font-semibold">
                  Fecha inicio
                </Label>
                <Input
                  id="pattern-start"
                  type="date"
                  className="h-9"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.startDate.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pattern-end" className="text-xs font-semibold">
                  Fin (opcional)
                </Label>
                <Input
                  id="pattern-end"
                  type="date"
                  className="h-9"
                  {...form.register("endDate")}
                />
              </div>
            </div>

            {/* Asignación de turnos a los días del ciclo */}
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Asignación por día del ciclo</Label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {days.length} {days.length === 1 ? "día" : "días"}
                </span>
              </div>

              {/* Tira de previsualización cromática */}
              <div className="flex gap-1 overflow-x-auto py-1">
                {days.map((day, idx) => {
                  const shift = day.shiftTypeId ? shiftsById.get(day.shiftTypeId) : undefined;
                  return (
                    <div
                      key={idx}
                      title={`${type === "weekly" ? WEEKLY_DAY_LABELS[idx] : `Día ${idx + 1}`}: ${shift ? shift.name : "Descanso"}`}
                      className="flex h-5 min-w-5 flex-1 items-center justify-center rounded text-[10px] font-bold text-white shadow-2xs"
                      style={{
                        backgroundColor: day.isRestDay || !shift ? "#94a3b8" : shift.color,
                      }}
                    >
                      {type === "weekly" ? (WEEKLY_DAY_LABELS[idx]?.[0] ?? idx + 1) : idx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Selector por cada día */}
              <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1 pt-1">
                {days.map((day, index) => {
                  const shift = day.shiftTypeId ? shiftsById.get(day.shiftTypeId) : undefined;
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-[5rem_1fr] items-center gap-2 rounded-lg bg-background/60 p-1.5 border border-border/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: day.isRestDay || !shift ? "#94a3b8" : shift.color,
                          }}
                        />
                        <span className="text-xs font-semibold text-foreground">
                          {type === "weekly"
                            ? WEEKLY_DAY_LABELS[index]
                            : `Día ${index + 1}`}
                        </span>
                      </div>
                      <select
                        aria-label={`Turno del día ${index + 1}`}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={day.isRestDay ? "__rest" : (day.shiftTypeId ?? "")}
                        onChange={(event) => updateDay(index, event.target.value)}
                      >
                        <option value="__rest">Descanso</option>
                        {(shifts ?? []).map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {form.formState.errors.days ? (
                <p className="text-destructive text-xs">
                  Revisa los días del patrón.
                </p>
              ) : null}

              {(shifts ?? []).length === 0 ? (
                <p className="text-muted-foreground text-xs pt-1">
                  No tienes turnos creados aún.{" "}
                  <Link className="text-primary underline font-medium" href="/shifts">
                    Crea un turno
                  </Link>{" "}
                  para poder asignarlo.
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                className="flex-1 shadow-2xs"
                disabled={form.formState.isSubmitting}
              >
                {editingId ? "Guardar cambios" : "Crear patrón"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={resetForm}
                >
                  <X className="size-3.5" />
                  <span>Cancelar</span>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Catálogo y selector de patrones */}
      <div className="flex flex-col gap-4 order-1 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Patrones de turnos
            </h2>
            <p className="text-muted-foreground text-xs">
              Secuencias configuradas para proyectar el calendario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isFormOpenMobile || editingId ? "secondary" : "default"}
              size="sm"
              className="lg:hidden h-8 text-xs gap-1"
              onClick={() => {
                if (isFormOpenMobile || editingId) {
                  setIsFormOpenMobile(false);
                  resetForm();
                } else {
                  setIsFormOpenMobile(true);
                  setTimeout(() => {
                    document.getElementById("pattern-form-card")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }
              }}
            >
              {isFormOpenMobile || editingId ? (
                <>
                  <X className="size-3.5" />
                  <span>Cerrar</span>
                </>
              ) : (
                <>
                  <RotateCw className="size-3.5" />
                  <span>Nuevo</span>
                </>
              )}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-2xs">
              <Link href="/calendar">
                <Calendar className="size-3.5" />
                <span>Ver calendario</span>
              </Link>
            </Button>
          </div>
        </div>

        {patterns === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <Clock className="size-4 animate-spin" />
            <span>Cargando patrones…</span>
          </div>
        ) : sortedPatterns.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-dashed">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <RotateCw className="size-6" />
            </div>
            <CardTitle className="text-base font-semibold">
              Todavía no has creado ningún patrón
            </CardTitle>
            <CardDescription className="max-w-xs text-xs mt-1">
              Diseña un patrón semanal o rotativo con el formulario para empezar a proyectar tus turnos en el calendario.
            </CardDescription>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Si hay más de 1 patrón, mostramos un selector / combo box rápido */}
            {sortedPatterns.length > 1 ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pattern-select-view" className="text-xs font-semibold">
                    Seleccionar patrón para inspeccionar:
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {sortedPatterns.length} patrones
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="pattern-select-view"
                    aria-label="Seleccionar patrón para inspeccionar"
                    value={activePattern?._id ?? ""}
                    onChange={(e) => setSelectedPatternId(e.target.value)}
                    className="h-9 w-full appearance-none rounded-xl border border-border/80 bg-background px-3 pr-8 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {sortedPatterns.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.type === "weekly" ? "Semanal" : `${p.cycleLength}d`} · desde {p.startDate})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
                </div>
              </div>
            ) : null}

            {/* Tarjeta detallada del patrón activo seleccionado */}
            {activePattern ? (
              <Card
                className={cn(
                  "border-border/80 overflow-hidden rounded-2xl shadow-2xs transition-all",
                  editingId === activePattern._id && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="size-3.5" />
                      </div>
                      <CardTitle className="text-base font-semibold">
                        {activePattern.name}
                      </CardTitle>
                    </div>
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold">
                      {activePattern.type === "weekly"
                        ? "Semanal (7 días)"
                        : `Rotativo (${activePattern.cycleLength} días)`}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Vigencia: desde <span className="font-semibold text-foreground">{activePattern.startDate}</span>
                    {activePattern.endDate ? (
                      <> hasta <span className="font-semibold text-foreground">{activePattern.endDate}</span></>
                    ) : " en adelante"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 flex flex-col gap-3">
                  {/* Tira cromática de días */}
                  <div className="flex flex-wrap gap-1.5">
                    {activePattern.days.map((day) => {
                      const shift =
                        day.shiftTypeId !== undefined
                          ? shiftsById.get(day.shiftTypeId)
                          : undefined;
                      return (
                        <span
                          key={day.dayIndex}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-2xs"
                          style={
                            shift
                              ? {
                                  borderColor: shift.color,
                                  backgroundColor: `${shift.color}15`,
                                }
                              : {
                                  borderColor: "var(--border)",
                                  backgroundColor: "var(--muted)",
                                }
                          }
                        >
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {activePattern.type === "weekly"
                              ? WEEKLY_DAY_LABELS[day.dayIndex]
                              : `D${day.dayIndex + 1}`}
                          </span>
                          <span className="font-semibold text-foreground">
                            {shift ? shift.name : "Descanso"}
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Acciones */}
                  {renamingId === activePattern._id ? (
                    <div className="flex gap-2 pt-1 border-t border-border/60">
                      <Input
                        aria-label="Nuevo nombre"
                        value={renameValue}
                        className="h-8 text-xs"
                        onChange={(event) => setRenameValue(event.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => void submitRename(activePattern._id)}
                        disabled={renameValue.trim().length === 0}
                      >
                        <Check className="size-3" />
                        <span>Guardar</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => {
                          setRenamingId(null);
                          setRenameValue("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 border-t border-border/60 pt-2 flex-wrap">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 gap-1 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setPatternToApply(activePattern)}
                        title="Proyecta los turnos de este patrón a una semana o fecha concreta como excepciones"
                      >
                        <Sparkles className="size-3" />
                        <span>Aplicar a fecha...</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => startEditing(activePattern)}
                      >
                        <Pencil className="size-3" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          setRenamingId(activePattern._id);
                          setRenameValue(activePattern.name);
                        }}
                      >
                        <Pencil className="size-3" />
                        <span>Renombrar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => void archive(activePattern._id)}
                        title="Archiva el patrón cerrándolo con fecha de finalización"
                      >
                        <Archive className="size-3" />
                        <span>Archivar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => void remove(activePattern._id)}
                        title="Elimina el patrón por completo si fue un error"
                      >
                        <Trash2 className="size-3" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Listado colapsable o compacto de otros patrones anteriores si hay más de 1 */}
            {sortedPatterns.length > 1 ? (
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-xs font-semibold text-muted-foreground px-1">
                  Todos tus patrones:
                </span>
                <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                  {sortedPatterns.map((p) => {
                    const isSelected = p._id === activePattern?._id;
                    return (
                      <div
                        key={p._id}
                        onClick={() => setSelectedPatternId(p._id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 text-xs transition-colors cursor-pointer select-none",
                          isSelected
                            ? "bg-primary/5 font-semibold text-primary"
                            : "hover:bg-muted/30 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              isSelected ? "bg-primary" : "bg-muted-foreground/40"
                            )}
                          />
                          <span>{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({p.type === "weekly" ? "Semanal" : `${p.cycleLength}d`})
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {p.startDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {patternToApply ? (
          <ApplyPatternDialog
            pattern={patternToApply}
            isOpen={Boolean(patternToApply)}
            onClose={() => setPatternToApply(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
