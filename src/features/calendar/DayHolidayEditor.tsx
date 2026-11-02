"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { convexErrorMessage } from "@/lib/utils/convex-error";
import {
  defaultHolidayValues,
  HOLIDAY_SCOPE_LABELS,
  holidayFormSchema,
  type HolidayFormValues,
} from "@/lib/validators/holiday";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type ExistingHoliday = {
  _id: Id<"holidays">;
  name: string;
  scope: HolidayFormValues["scope"];
};

type DayHolidayEditorProps = {
  date: string;
  holidays: ExistingHoliday[];
};

/**
 * Panel para añadir y quitar festivos de un día concreto.
 * Se permite más de un festivo por fecha (por ejemplo, nacional y local).
 */
export function DayHolidayEditor({ date, holidays }: DayHolidayEditorProps) {
  const createHoliday = useMutation(api.holidays.create);
  const removeHoliday = useMutation(api.holidays.remove);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: defaultHolidayValues(),
  });

  async function onSubmit(values: HolidayFormValues) {
    setError(null);
    try {
      await createHoliday({ date, ...values });
      form.reset(defaultHolidayValues());
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo guardar el festivo."));
    }
  }

  async function remove(id: Id<"holidays">) {
    setError(null);
    try {
      await removeHoliday({ id });
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo eliminar el festivo."));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Festivos del día</CardTitle>
        <CardDescription>
          Marca este día como festivo para identificarlo en el calendario.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {holidays.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {holidays.map((holiday) => (
              <li
                key={holiday._id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {HOLIDAY_SCOPE_LABELS[holiday.scope]}
                  </span>
                  {holiday.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(holiday._id)}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Este día no está marcado como festivo.
          </p>
        )}

        <form
          className="flex flex-col gap-3 border-t pt-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="holiday-name">Nombre</Label>
              <Input id="holiday-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="holiday-scope">Ámbito</Label>
              <select
                id="holiday-scope"
                className={selectClassName}
                {...form.register("scope")}
              >
                {Object.entries(HOLIDAY_SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={form.formState.isSubmitting}
          >
            Añadir festivo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
