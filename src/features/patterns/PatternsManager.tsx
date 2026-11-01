"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { weekdayOf } from "@/lib/dates/local-date";
import {
  defaultPatternValues,
  nextMondayLocalDate,
  patternFormSchema,
  todayLocalDate,
  WEEKLY_DAY_LABELS,
  type PatternFormValues,
} from "@/lib/validators/pattern";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function errorMessage(error: unknown, fallback: string): string {
  if (error === null || typeof error !== "object" || !("data" in error)) {
    return fallback;
  }
  const data = (error as { data?: unknown }).data;
  if (data === null || typeof data !== "object" || !("message" in data)) {
    return fallback;
  }
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}

export function PatternsManager() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const patterns = useQuery(api.patterns.list, isAuthenticated ? {} : "skip");
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");
  const createPattern = useMutation(api.patterns.create);
  const updatePattern = useMutation(api.patterns.update);
  const renamePattern = useMutation(api.patterns.rename);
  const archivePattern = useMutation(api.patterns.archive);

  const [editingId, setEditingId] = useState<Id<"shiftPatterns"> | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"shiftPatterns"> | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: defaultPatternValues(),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const cycleLength = useWatch({ control: form.control, name: "cycleLength" });
  const days = useWatch({ control: form.control, name: "days" });
  const today = todayLocalDate();

  const shiftsById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [shift._id, shift])),
    [shifts],
  );

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
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
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
    const current = form.getValues("days");
    const next = current.map((day, dayIndex) => {
      if (dayIndex !== index) {
        return day;
      }
      if (value === "__rest") {
        return { ...day, isRestDay: true, shiftTypeId: undefined };
      }
      return { ...day, isRestDay: false, shiftTypeId: value };
    });
    form.setValue("days", next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }

  async function onSubmit(values: PatternFormValues) {
    setError(null);
    const payload = {
      name: values.name.trim(),
      type: values.type,
      cycleLength: values.type === "weekly" ? 7 : values.cycleLength,
      anchorDate: values.anchorDate,
      startDate: values.startDate,
      endDate: values.endDate === "" ? undefined : values.endDate,
      days: values.days.map((day, index) => ({
        dayIndex: index,
        isRestDay: day.isRestDay,
        shiftTypeId:
          day.isRestDay || !day.shiftTypeId
            ? undefined
            : (day.shiftTypeId as Id<"shiftTypes">),
      })),
    };

    try {
      if (editingId) {
        await updatePattern({ id: editingId, ...payload });
      } else {
        await createPattern(payload);
      }
      resetForm();
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo guardar el patrón."));
    }
  }

  function startEditing(pattern: NonNullable<typeof patterns>[number]) {
    setEditingId(pattern._id);
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
  }

  async function submitRename(id: Id<"shiftPatterns">) {
    setError(null);
    try {
      await renamePattern({ id, name: renameValue });
      setRenamingId(null);
      setRenameValue("");
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo renombrar el patrón."));
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
      setError(errorMessage(caught, "No se pudo archivar el patrón."));
    }
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[24rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar patrón" : "Nuevo patrón"}</CardTitle>
          <CardDescription>
            Define el ciclo y qué turno corresponde a cada día.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="pattern-name">Nombre</Label>
              <Input id="pattern-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pattern-type">Tipo</Label>
                <select
                  id="pattern-type"
                  className={selectClassName}
                  value={type}
                  onChange={(event) =>
                    handleTypeChange(
                      event.target.value as "weekly" | "rotating",
                    )
                  }
                >
                  <option value="weekly">Semanal</option>
                  <option value="rotating">Rotativo</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pattern-cycle">Días del ciclo</Label>
                <Input
                  id="pattern-cycle"
                  type="number"
                  min={1}
                  max={365}
                  disabled={type === "weekly"}
                  {...form.register("cycleLength", { valueAsNumber: true })}
                />
                {form.formState.errors.cycleLength ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.cycleLength.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pattern-anchor">
                {type === "weekly" ? "Lunes de referencia" : "Día 0 del ciclo"}
              </Label>
              <Input
                id="pattern-anchor"
                type="date"
                {...form.register("anchorDate")}
              />
              {form.formState.errors.anchorDate ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.anchorDate.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pattern-start">Empieza</Label>
                <Input
                  id="pattern-start"
                  type="date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.startDate.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pattern-end">Termina (opcional)</Label>
                <Input
                  id="pattern-end"
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.endDate.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Días del ciclo</Label>
              <div className="flex flex-col gap-2">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[4.5rem_1fr] items-center gap-2"
                  >
                    <span className="text-muted-foreground text-xs font-medium">
                      {type === "weekly"
                        ? WEEKLY_DAY_LABELS[index]
                        : `Día ${index + 1}`}
                    </span>
                    <select
                      aria-label={`Turno del día ${index + 1}`}
                      className={selectClassName}
                      value={day.isRestDay ? "__rest" : (day.shiftTypeId ?? "")}
                      onChange={(event) => updateDay(index, event.target.value)}
                    >
                      <option value="__rest">Descanso</option>
                      {(shifts ?? []).map((shift) => (
                        <option key={shift._id} value={shift._id}>
                          {shift.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {form.formState.errors.days ? (
                <p className="text-destructive text-xs">
                  Revisa los días del patrón.
                </p>
              ) : null}
              {(shifts ?? []).length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No tienes turnos todavía.{" "}
                  <Link className="underline" href="/shifts">
                    Crea un turno
                  </Link>{" "}
                  antes de asignarlo a un patrón.
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingId ? "Guardar cambios" : "Crear patrón"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tus patrones</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar">Ver calendario</Link>
          </Button>
        </div>
        {patterns === undefined ? (
          <p className="text-muted-foreground text-sm">Cargando patrones…</p>
        ) : patterns.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no has creado ningún patrón.
          </p>
        ) : (
          [...patterns]
            .sort((left, right) =>
              right.startDate.localeCompare(left.startDate),
            )
            .map((pattern) => {
              const editable = pattern.startDate > today;
              return (
                <Card key={pattern._id}>
                  <CardHeader>
                    <CardTitle>{pattern.name}</CardTitle>
                    <CardDescription>
                      {pattern.type === "weekly"
                        ? "Semanal"
                        : `Rotativo de ${pattern.cycleLength} días`}{" "}
                      · desde {pattern.startDate}
                      {pattern.endDate ? ` hasta ${pattern.endDate}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {pattern.days.map((day) => {
                        const shift =
                          day.shiftTypeId !== undefined
                            ? shiftsById.get(day.shiftTypeId)
                            : undefined;
                        return (
                          <span
                            key={day.dayIndex}
                            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            style={
                              shift
                                ? {
                                    borderColor: shift.color,
                                    backgroundColor: `${shift.color}1a`,
                                  }
                                : undefined
                            }
                          >
                            <span className="text-muted-foreground">
                              {pattern.type === "weekly"
                                ? WEEKLY_DAY_LABELS[day.dayIndex]
                                : `D${day.dayIndex + 1}`}
                            </span>
                            <span>{shift ? shift.name : "Descanso"}</span>
                          </span>
                        );
                      })}
                    </div>

                    {renamingId === pattern._id ? (
                      <div className="flex gap-2">
                        <Input
                          aria-label="Nuevo nombre"
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void submitRename(pattern._id)}
                          disabled={renameValue.trim().length === 0}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRenamingId(null);
                            setRenameValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(pattern)}
                          >
                            Editar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenamingId(pattern._id);
                              setRenameValue(pattern.name);
                            }}
                          >
                            Renombrar
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void archive(pattern._id)}
                        >
                          Archivar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
        )}
        <p className="text-muted-foreground text-xs">
          Para cambiar un patrón ya iniciado, archívalo y crea uno nuevo desde
          la fecha deseada. Así el historial no cambia.
        </p>
      </div>
    </div>
  );
}
