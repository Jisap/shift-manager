import { z } from "zod";
import { weekdayOf } from "@/lib/dates/local-date";

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD");

export const patternDaySchema = z.object({
  dayIndex: z.number().int().min(0),
  isRestDay: z.boolean(),
  shiftTypeId: z.string().optional(),
});

export const patternFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(60, "Máximo 60 caracteres"),
    type: z.enum(["weekly", "rotating"]),
    cycleLength: z
      .number()
      .int("Debe ser un número entero")
      .min(1, "Mínimo 1 día")
      .max(365, "Máximo 365 días"),
    anchorDate: localDate,
    startDate: localDate,
    endDate: z.union([localDate, z.literal("")]),
    days: z.array(patternDaySchema).min(1).max(365),
  })
  .superRefine((value, ctx) => {
    const cycleLength = value.type === "weekly" ? 7 : value.cycleLength;
    if (value.type === "weekly" && value.cycleLength !== 7) {
      ctx.addIssue({
        code: "custom",
        message: "Un patrón semanal debe durar 7 días",
        path: ["cycleLength"],
      });
    }
    if (value.type === "weekly" && weekdayOf(value.anchorDate) !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de anclaje debe ser lunes",
        path: ["anchorDate"],
      });
    }
    if (value.endDate !== "" && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha final no puede ser anterior al inicio",
        path: ["endDate"],
      });
    }
    if (value.days.length !== cycleLength) {
      ctx.addIssue({
        code: "custom",
        message: `El patrón necesita ${cycleLength} días`,
        path: ["days"],
      });
    }
    const seen = new Set<number>();
    value.days.forEach((day, index) => {
      if (day.dayIndex !== index || day.dayIndex >= cycleLength) {
        ctx.addIssue({
          code: "custom",
          message: "Los días del ciclo están desordenados",
          path: ["days", index],
        });
      }
      if (seen.has(day.dayIndex)) {
        ctx.addIssue({
          code: "custom",
          message: "Hay posiciones de ciclo duplicadas",
          path: ["days", index],
        });
      }
      seen.add(day.dayIndex);
      if (!day.isRestDay && !day.shiftTypeId) {
        ctx.addIssue({
          code: "custom",
          message: "Selecciona un turno",
          path: ["days", index, "shiftTypeId"],
        });
      }
    });
  });

export type PatternFormValues = z.infer<typeof patternFormSchema>;

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function weekdayLabel(dayIndex: number): string {
  return WEEKDAY_NAMES[(dayIndex + 1) % 7] ?? `Día ${dayIndex + 1}`;
}

export function nextMondayLocalDate(): string {
  const date = new Date();
  const day = date.getDay();
  const offset = day === 1 ? 0 : (8 - day) % 7;
  date.setDate(date.getDate() + offset);
  return formatLocalDateInput(date);
}

export function todayLocalDate(): string {
  return formatLocalDateInput(new Date());
}

function formatLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultPatternValues(): PatternFormValues {
  return {
    name: "",
    type: "weekly",
    cycleLength: 7,
    anchorDate: nextMondayLocalDate(),
    startDate: todayLocalDate(),
    endDate: "",
    days: Array.from({ length: 7 }, (_, dayIndex) => ({
      dayIndex,
      isRestDay: true,
      shiftTypeId: undefined,
    })),
  };
}

export const WEEKLY_DAY_LABELS = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];
