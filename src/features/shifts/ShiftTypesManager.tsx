"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Archive,
  Clock,
  Coffee,
  Copy,
  Layers,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
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
import { cn } from "@/lib/utils";
import {
  defaultShiftType,
  shiftTypeSchema,
  totalBreakMinutes,
  type ShiftTypeInput,
} from "@/lib/validators/shift";

/** Paleta de colores recomendados para turnos habituales (mañana, tarde, noche, etc.) */
const PRESET_COLORS = [
  { label: "Ámbar / Mañana", value: "#f59e0b" },
  { label: "Azul / Tarde", value: "#3b82f6" },
  { label: "Índigo / Noche", value: "#6366f1" },
  { label: "Esmeralda / Refuerzo", value: "#10b981" },
  { label: "Rosa / Guardia", value: "#ec4899" },
  { label: "Púrpura / Partido", value: "#8b5cf6" },
  { label: "Gris / Especial", value: "#64748b" },
];

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
  // Control de formulario visible en móvil
  const [isFormOpenMobile, setIsFormOpenMobile] = useState(false);

  // Estados de vista compacta/cuadrícula y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("compact");

  const form = useForm<ShiftTypeInput>({
    resolver: zodResolver(shiftTypeSchema),
    defaultValues: defaultShiftType,
  });
  const intervals = useFieldArray({ control: form.control, name: "intervals" });
  const breaks = useFieldArray({ control: form.control, name: "breaks" });

  const currentColor = useWatch({ control: form.control, name: "color" });
  const isBreakPaid = useWatch({ control: form.control, name: "breakPaid" });

  // Filtrado de turnos según término de búsqueda
  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return shifts;
    return shifts.filter(
      (shift) =>
        shift.name.toLowerCase().includes(query) ||
        (shift.description && shift.description.toLowerCase().includes(query)) ||
        shift.intervals.some((i) => i.start.includes(query) || i.end.includes(query))
    );
  }, [shifts, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
        <Clock className="size-4 animate-spin" />
        <span>Cargando turnos…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md rounded-2xl shadow-2xs">
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
      setIsFormOpenMobile(false);
    } catch {
      setError("No se pudo guardar el turno. Revisa los datos.");
    }
  }

  function startEditing(shift: NonNullable<typeof shifts>[number]) {
    setEditingId(shift._id);
    setIsFormOpenMobile(true);
    setError(null);
    form.reset({
      name: shift.name,
      color: shift.color,
      description: shift.description ?? "",
      intervals: shift.intervals,
      breaks: shift.breaks ?? [],
      breakPaid: shift.breakPaid,
    });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("shift-form-card")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function duplicate(id: Id<"shiftTypes">) {
    setListError(null);
    try {
      await duplicateShift({ id });
    } catch {
      setListError("No se pudo duplicar el turno.");
    }
  }

  async function archive(id: Id<"shiftTypes">) {
    setListError(null);
    try {
      await archiveShift({ id });
    } catch {
      setListError("No se pudo archivar el turno.");
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[24rem_1fr] lg:items-start">
      {/* Formulario de creación / edición: en móvil solo se muestra si se solicita o edita */}
      <Card
        id="shift-form-card"
        className={cn(
          "border-border/80 rounded-2xl shadow-2xs overflow-hidden lg:sticky lg:top-20 order-2 lg:order-1 transition-all",
          !isFormOpenMobile && !editingId && "hidden lg:block"
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-lg text-white shadow-xs"
              style={{ backgroundColor: currentColor || "#4f46e5" }}
            >
              <Clock className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {editingId ? "Editar turno" : "Nuevo tipo de turno"}
              </CardTitle>
              <CardDescription className="text-xs">
                Define el nombre, color identificador y tramos horarios.
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
              <Label htmlFor="name" className="text-xs font-semibold">
                Nombre del turno
              </Label>
              <Input
                id="name"
                placeholder="Ej. Mañana, Tarde, Guardia..."
                className="h-9"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Descripción (opcional)
              </Label>
              <Input
                id="description"
                placeholder="Notas de apoyo o centro de trabajo"
                className="h-9"
                {...form.register("description")}
              />
            </div>

            {/* Selector de Color con Presets */}
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="color" className="text-xs font-semibold">
                  Color distintivo
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">
                    {currentColor}
                  </span>
                  <input
                    id="color"
                    type="color"
                    aria-label="Color personalizado"
                    className="size-6 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
                    {...form.register("color")}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    onClick={() => form.setValue("color", preset.value, { shouldDirty: true })}
                    className={cn(
                      "size-6 rounded-full border-2 transition-transform hover:scale-110",
                      currentColor?.toLowerCase() === preset.value.toLowerCase()
                        ? "border-primary ring-2 ring-primary/40 scale-105"
                        : "border-background shadow-2xs"
                    )}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
            </div>

            {/* Intervalos de trabajo */}
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Intervalos de trabajo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    intervals.append({ start: "08:00", end: "16:00" })
                  }
                  disabled={intervals.fields.length >= 4}
                >
                  <Plus className="size-3" />
                  <span>Tramo</span>
                </Button>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {intervals.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Input
                        type="time"
                        className="h-8 text-center text-xs"
                        aria-label={`Entrada ${index + 1}`}
                        {...form.register(`intervals.${index}.start`)}
                      />
                      <Input
                        type="time"
                        className="h-8 text-center text-xs"
                        aria-label={`Salida ${index + 1}`}
                        {...form.register(`intervals.${index}.end`)}
                      />
                    </div>
                    {intervals.fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => intervals.remove(index)}
                        aria-label="Quitar tramo"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Descansos y pausas */}
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coffee className="size-3.5 text-muted-foreground" />
                  <Label className="text-xs font-semibold">Descansos no computables</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    breaks.append({ start: "13:00", end: "14:00" })
                  }
                  disabled={breaks.fields.length >= 3}
                >
                  <Plus className="size-3" />
                  <span>Pausa</span>
                </Button>
              </div>

              {breaks.fields.length === 0 ? (
                <p className="text-muted-foreground py-1 text-xs">Sin pausas programadas.</p>
              ) : null}

              <div className="flex flex-col gap-2 pt-1">
                {breaks.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Input
                        type="time"
                        className="h-8 text-center text-xs"
                        aria-label={`Inicio del descanso ${index + 1}`}
                        {...form.register(`breaks.${index}.start`)}
                      />
                      <Input
                        type="time"
                        className="h-8 text-center text-xs"
                        aria-label={`Fin del descanso ${index + 1}`}
                        {...form.register(`breaks.${index}.end`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => breaks.remove(index)}
                      aria-label="Quitar descanso"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Fila interruptor para descanso remunerado */}
              <div
                onClick={() =>
                  form.setValue("breakPaid", !isBreakPaid, { shouldDirty: true })
                }
                className={cn(
                  "mt-1 flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors select-none",
                  isBreakPaid
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-background/50 hover:bg-muted/40"
                )}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Descanso remunerado</span>
                  <span className="text-muted-foreground text-[10px]">
                    Cuenta dentro del cómputo de horas de la jornada
                  </span>
                </div>
                <div
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                    isBreakPaid ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
                      isBreakPaid ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
              </div>
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
                {editingId ? "Guardar cambios" : "Crear turno"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setEditingId(null);
                    setError(null);
                    form.reset(defaultShiftType);
                  }}
                >
                  <X className="size-3.5" />
                  <span>Cancelar</span>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listado de turnos creados */}
      <div className="flex flex-col gap-4 order-1 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Catálogo de turnos
            </h2>
            <p className="text-muted-foreground text-xs">
              Turnos disponibles para componer tus patrones y calendarios.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shifts && shifts.length > 0 ? (
              <div className="flex items-center rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("compact")}
                  title="Vista lista compacta"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors",
                    viewMode === "compact"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Vista tarjetas"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors",
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
              </div>
            ) : null}

            <Button
              type="button"
              variant={isFormOpenMobile || editingId ? "secondary" : "default"}
              size="sm"
              className="lg:hidden h-8 text-xs gap-1 shadow-2xs"
              onClick={() => {
                if (isFormOpenMobile || editingId) {
                  setIsFormOpenMobile(false);
                  setEditingId(null);
                  form.reset(defaultShiftType);
                } else {
                  setIsFormOpenMobile(true);
                  setTimeout(() => {
                    document.getElementById("shift-form-card")?.scrollIntoView({ behavior: "smooth" });
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
                  <Plus className="size-3.5" />
                  <span>Nuevo</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Buscador rápido si hay más de 3 turnos */}
        {shifts && shifts.length > 3 ? (
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-2.5 size-3.5" />
            <Input
              placeholder="Buscar turno por nombre u horario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl bg-background/80"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}

        {listError ? (
          <p className="text-destructive text-sm" role="alert">
            {listError}
          </p>
        ) : null}

        {shifts === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <Clock className="size-4 animate-spin" />
            <span>Cargando turnos…</span>
          </div>
        ) : filteredShifts.length === 0 ? (
          searchQuery ? (
            <p className="text-muted-foreground text-xs py-4 text-center">
              No se encontraron turnos que coincidan con &quot;{searchQuery}&quot;.
            </p>
          ) : (
            /* Estado vacío ilustrado */
            <Card className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-dashed">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                <Layers className="size-6" />
              </div>
              <CardTitle className="text-base font-semibold">
                Todavía no has creado ningún turno
              </CardTitle>
              <CardDescription className="max-w-xs text-xs mt-1">
                Usa el formulario lateral para definir tu primer turno de mañana, tarde, noche o partido.
              </CardDescription>
            </Card>
          )
        ) : viewMode === "compact" ? (
          /* Vista lista compacta (ocupa poquísimo espacio vertical) */
          <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            {filteredShifts.map((shift) => (
              <div
                key={shift._id}
                className={cn(
                  "flex items-center justify-between p-3 transition-colors hover:bg-muted/30 gap-2",
                  editingId === shift._id && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="size-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: shift.color }}
                    aria-hidden
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate text-foreground">
                      {shift.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {shift.intervals.map((i) => `${i.start}–${i.end}`).join(", ")}
                      {shift.breakMinutes > 0 ? ` · ${shift.breakMinutes}m pausa` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => startEditing(shift)}
                    title="Editar turno"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => void duplicate(shift._id)}
                    title="Duplicar turno"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void archive(shift._id)}
                    title="Archivar turno"
                  >
                    <Archive className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Cuadrícula moderna de turnos */
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredShifts.map((shift) => (
              <Card
                key={shift._id}
                className={cn(
                  "border-border/80 flex flex-col justify-between overflow-hidden rounded-2xl shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs",
                  editingId === shift._id && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <div>
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: shift.color }}
                  />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-background shadow-xs"
                          style={{ backgroundColor: shift.color }}
                          aria-hidden
                        />
                        <CardTitle className="text-base font-semibold truncate">
                          {shift.name}
                        </CardTitle>
                      </div>
                    </div>
                    {shift.description ? (
                      <CardDescription className="text-xs line-clamp-1">
                        {shift.description}
                      </CardDescription>
                    ) : null}
                  </CardHeader>

                  <CardContent className="p-4 pt-1 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1 text-xs">
                      {shift.intervals.map((interval) => (
                        <span
                          key={`${interval.start}-${interval.end}`}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium"
                        >
                          {interval.start} – {interval.end}
                        </span>
                      ))}
                    </div>

                    <p className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <Coffee className="size-3 shrink-0" />
                      <span>
                        {shift.breaks && shift.breaks.length > 0
                          ? `${shift.breaks
                              .map((rest) => `${rest.start}–${rest.end}`)
                              .join(", ")} (${shift.breakMinutes} min${
                              shift.breakPaid ? " · pagado" : ""
                            })`
                          : "Sin descansos"}
                      </span>
                    </p>
                  </CardContent>
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-border/60 bg-muted/20 p-2 px-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => startEditing(shift)}
                    title="Editar turno"
                  >
                    <Pencil className="size-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => void duplicate(shift._id)}
                    title="Duplicar turno"
                  >
                    <Copy className="size-3" />
                    <span>Duplicar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => void archive(shift._id)}
                    title="Archivar turno"
                  >
                    <Archive className="size-3" />
                    <span>Archivar</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
