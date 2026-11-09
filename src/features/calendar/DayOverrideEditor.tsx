"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { convexErrorMessage } from "@/lib/utils/convex-error";
import {
  defaultOverrideValues,
  overrideFormSchema,
  type OverrideFormValues,
} from "@/lib/validators/override";

// Clases compartidas para los <select> y el <textarea> nativos, de modo que
// tengan el mismo aspecto (bordes, foco, modo oscuro) que los componentes de
// shadcn/ui del resto de la app.
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const textareaClassName =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// Datos mínimos de un tipo de turno que necesita el desplegable.
type ShiftOption = {
  _id: Id<"shiftTypes">;
  name: string;
};

// Excepción ya guardada en la base de datos para ese día (si existe).
type ExistingOverride = {
  _id: Id<"scheduleOverrides">;
  kind: OverrideFormValues["kind"];
  shiftTypeId?: Id<"shiftTypes">;
  notes?: string;
};

type DayOverrideEditorProps = {
  /** Fecha del día a editar, en formato "yyyy-MM-dd". */
  date: string;
  /** Tipos de turno disponibles para el desplegable. */
  shifts: ShiftOption[];
  /** Excepción actual del día; si no se pasa, el panel crea una nueva. */
  existing?: ExistingOverride;
  /** Se invoca al guardar, eliminar o cancelar para cerrar el panel. */
  onClose: () => void;
};

/**
 * Panel para crear, editar o eliminar la excepción puntual de un día.
 * Sustituye el cálculo del patrón solo para esa fecha.
 */
export function DayOverrideEditor({
  date,
  shifts,
  existing,
  onClose,
}: DayOverrideEditorProps) {
  // Mutaciones de Convex: una por cada operación posible.
  const createOverride = useMutation(api.overrides.create);
  const updateOverride = useMutation(api.overrides.update);
  const removeOverride = useMutation(api.overrides.remove);
  const setDayRest = useMutation(api.overrides.setDayRest);
  // Mensaje de error del backend (null si no hay ninguno).
  const [error, setError] = useState<string | null>(null);
  const [isResting, setIsResting] = useState(false);

  // Formulario con validación Zod. Si ya existe una excepción se pre-rellena
  // con sus valores; si no, se usan los valores por defecto.
  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: existing
      ? {
        kind: existing.kind,
        shiftTypeId: existing.shiftTypeId,
        notes: existing.notes ?? "",
      }
      : defaultOverrideValues(),
  });
  // `useWatch` suscribe el componente a estos campos para re-renderizar al
  // cambiar: `kind` decide si se muestra el selector de turno y
  // `shiftTypeId` es el valor controlado de ese selector.
  const kind = useWatch({ control: form.control, name: "kind" });
  const shiftTypeId = useWatch({ control: form.control, name: "shiftTypeId" });

  /**
   * Envía el formulario al backend (creación o actualización según `existing`).
   * Normaliza `notes` vacío a `undefined` y omite `shiftTypeId` en descansos.
   */
  async function onSubmit(values: OverrideFormValues) {
    setError(null);
    const payload = {
      kind: values.kind,
      shiftTypeId:
        values.kind === "rest"
          ? undefined
          : (values.shiftTypeId as Id<"shiftTypes"> | undefined),
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };

    try {
      if (existing) {
        await updateOverride({ id: existing._id, ...payload });
      } else {
        await createOverride({ date, ...payload });
      }
      onClose();
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudo guardar la excepción."),
      );
    }
  }

  /**
   * Pone directamente este día en Descanso (rest) con un solo clic.
   */
  async function handleSetRest() {
    setError(null);
    setIsResting(true);
    try {
      await setDayRest({ date });
      onClose();
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudo poner el día en descanso."),
      );
    } finally {
      setIsResting(false);
    }
  }

  /**
   * Elimina la excepción existente. Solo se llama si `existing` está definido;
   * la comprobación interna hace la operación idempotente frente a doble clic.
   */
  async function remove() {
    if (!existing) {
      return;
    }
    setError(null);
    try {
      await removeOverride({ id: existing._id });
      onClose();
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudo eliminar la excepción."),
      );
    }
  }

  return (
    <Card>
      {/* Cabecera: fecha en español (p. ej. "lunes 3 de noviembre") y una
          descripción que cambia según se cree o se edite */}
      <CardHeader>
        <CardTitle className="capitalize">
          {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
        </CardTitle>
        <CardDescription>
          {existing
            ? "Edita o elimina la excepción de este día."
            : "Sustituye el cálculo del patrón solo para este día."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Tipo de excepción: descanso, turno o día extra.
                Se controla a mano con setValue; solo revalida mientras
                el formulario ya se haya enviado alguna vez. */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="override-kind">Tipo</Label>
              <select
                id="override-kind"
                className={selectClassName}
                value={kind}
                onChange={(event) =>
                  form.setValue(
                    "kind",
                    event.target.value as OverrideFormValues["kind"],
                    { shouldValidate: form.formState.isSubmitted },
                  )
                }
              >
                <option value="rest">Descanso</option>
                <option value="shift">Turno</option>
                <option value="extra">Extra</option>
              </select>
            </div>

            {/* Selector de turno: solo tiene sentido si no es un descanso.
                Una opción vacía se guarda como `undefined`. */}
            {kind !== "rest" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-shift">Turno</Label>
                <select
                  id="override-shift"
                  className={selectClassName}
                  value={shiftTypeId ?? ""}
                  onChange={(event) =>
                    form.setValue("shiftTypeId", event.target.value || undefined, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                >
                  <option value="">Selecciona un turno</option>
                  {shifts.map((shift) => (
                    <option key={shift._id} value={shift._id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
                {/* Error de validación Zod (p. ej. turno obligatorio) */}
                {form.formState.errors.shiftTypeId ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.shiftTypeId.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Notas libres; aquí basta `register` porque es un campo no controlado */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="override-notes">Notas (opcional)</Label>
            <textarea
              id="override-notes"
              className={textareaClassName}
              {...form.register("notes")}
            />
            {form.formState.errors.notes ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.notes.message}
              </p>
            ) : null}
          </div>

          {/* Error devuelto por el backend; `role="alert"` para lectores de pantalla */}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {/* Acciones: guardar, descanso rápido, quitar excepción y cancelar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" disabled={form.formState.isSubmitting || isResting}>
              Guardar turno
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting || isResting}
              onClick={handleSetRest}
              title="Establece este día como descanso eliminando cualquier turno planificado"
            >
              {isResting ? "Marcando descanso..." : "Poner en descanso"}
            </Button>

            {existing ? (
              <Button
                type="button"
                variant="destructive"
                disabled={form.formState.isSubmitting || isResting}
                onClick={() => void remove()}
                title="Elimina cualquier excepción de este día y restaura el cálculo de tu patrón"
              >
                Restaurar al patrón
              </Button>
            ) : null}

            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}