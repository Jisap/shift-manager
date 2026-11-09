"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
  defaultShiftType,
  shiftTypeSchema,
  totalBreakMinutes,
  type ShiftTypeInput,
} from "@/lib/validators/shift";

export function ShiftTypesManager() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const shifts = useQuery(api.shiftTypes.list);
  const createShift = useMutation(api.shiftTypes.create);
  const updateShift = useMutation(api.shiftTypes.update);
  const archiveShift = useMutation(api.shiftTypes.archive);
  const duplicateShift = useMutation(api.shiftTypes.duplicate);
  const [editingId, setEditingId] = useState<Id<"shiftTypes"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const form = useForm<ShiftTypeInput>({
    resolver: zodResolver(shiftTypeSchema),
    defaultValues: defaultShiftType,
  });
  const intervals = useFieldArray({ control: form.control, name: "intervals" });
  const breaks = useFieldArray({ control: form.control, name: "breaks" });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para gestionar tus turnos.
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

  async function onSubmit(values: ShiftTypeInput) {
    setError(null);
    const payload = {
      ...values,
      breakMinutes: totalBreakMinutes(values.breaks),
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
    };
    try {
      if (editingId) {
        await updateShift({ id: editingId, ...payload });
      } else {
        await createShift(payload);
      }
      form.reset(defaultShiftType);
      setEditingId(null);
    } catch {
      setError("No se pudo guardar el turno. Revisa los datos.");
    }
  }

  function startEditing(shift: NonNullable<typeof shifts>[number]) {
    setEditingId(shift._id);
    setError(null);
    form.reset({
      name: shift.name,
      color: shift.color,
      description: shift.description ?? "",
      intervals: shift.intervals,
      breaks: shift.breaks ?? [],
      breakPaid: shift.breakPaid,
    });
  }

  /** Duplica un turno en el backend y limpia cualquier error previo. */
  async function duplicate(id: Id<"shiftTypes">) {
    setListError(null);
    try {
      await duplicateShift({ id });
    } catch {
      setListError("No se pudo duplicar el turno.");
    }
  }

  /** Archiva un turno y muestra un aviso si el backend lo rechaza. */
  async function archive(id: Id<"shiftTypes">) {
    setListError(null);
    try {
      await archiveShift({ id });
    } catch {
      setListError("No se pudo archivar el turno.");
    }
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[22rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar turno" : "Nuevo turno"}</CardTitle>
          <CardDescription>
            Define el nombre, el color y los intervalos de trabajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-[1fr_4rem] items-end gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" {...form.register("description")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  className="h-8 px-1"
                  {...form.register("color")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Intervalos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    intervals.append({ start: "08:00", end: "16:00" })
                  }
                  disabled={intervals.fields.length >= 4}
                >
                  Añadir
                </Button>
              </div>
              {intervals.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`Entrada ${index + 1}`}
                    {...form.register(`intervals.${index}.start`)}
                  />
                  <Input
                    type="time"
                    aria-label={`Salida ${index + 1}`}
                    {...form.register(`intervals.${index}.end`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => intervals.remove(index)}
                    disabled={intervals.fields.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Descansos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    breaks.append({ start: "13:00", end: "14:00" })
                  }
                  disabled={breaks.fields.length >= 3}
                >
                  Añadir descanso
                </Button>
              </div>
              {breaks.fields.length === 0 ? (
                <p className="text-muted-foreground text-xs">Sin descansos.</p>
              ) : null}
              {breaks.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`Inicio del descanso ${index + 1}`}
                    {...form.register(`breaks.${index}.start`)}
                  />
                  <Input
                    type="time"
                    aria-label={`Fin del descanso ${index + 1}`}
                    {...form.register(`breaks.${index}.end`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => breaks.remove(index)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("breakPaid")} />
                Descanso remunerado
              </label>
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingId ? "Guardar cambios" : "Crear turno"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setError(null);
                    form.reset(defaultShiftType);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tus turnos</h2>
        {listError ? (
          <p className="text-destructive text-sm" role="alert">
            {listError}
          </p>
        ) : null}
        {shifts === undefined ? (
          <p className="text-muted-foreground text-sm">Cargando turnos…</p>
        ) : shifts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no has creado ningún turno.
          </p>
        ) : (
          shifts.map((shift) => (
            <Card key={shift._id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: shift.color }}
                    aria-hidden
                  />
                  <CardTitle>{shift.name}</CardTitle>
                </div>
                {shift.description ? (
                  <CardDescription>{shift.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">
                  {shift.intervals
                    .map((interval) => `${interval.start}–${interval.end}`)
                    .join(" · ")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {shift.breaks && shift.breaks.length > 0
                    ? `Descansos: ${shift.breaks
                        .map((rest) => `${rest.start}–${rest.end}`)
                        .join(" · ")} (${shift.breakMinutes} min)`
                    : "Sin descansos"}
                  {shift.breakPaid && shift.breakMinutes > 0
                    ? " · remunerado"
                    : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(shift)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void duplicate(shift._id)}
                  >
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void archive(shift._id)}
                  >
                    Archivar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
