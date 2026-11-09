import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:mm");

export const shiftIntervalSchema = z
  .object({
    start: timeSchema,
    end: timeSchema,
  })
  .refine((value) => value.start !== value.end, {
    message: "La entrada y la salida no pueden coincidir",
  });

export const shiftTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(60, "Máximo 60 caracteres"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal no válido"),
  description: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
  intervals: z
    .array(shiftIntervalSchema)
    .min(1, "Añade al menos un intervalo")
    .max(4, "Máximo 4 intervalos"),
  breaks: z.array(shiftIntervalSchema).max(3, "Máximo 3 descansos"),
  breakPaid: z.boolean(),
});

export type ShiftTypeInput = z.infer<typeof shiftTypeSchema>;

/** Sufijo que se añade al nombre de un turno duplicado. */
export const SHIFT_COPY_SUFFIX = " (copia)";

/** Longitud máxima del nombre de un turno (igual que el schema Zod). */
export const SHIFT_NAME_MAX_LENGTH = 60;

/**
 * Nombre del duplicado de un turno.
 *
 * Se recorta el nombre original si hace falta para que el sufijo quepa dentro
 * del límite del schema. Un nombre vacío se sustituye por "Turno" para no
 * generar un duplicado inválido.
 */
export function copyShiftName(
  name: string,
  maxLength: number = SHIFT_NAME_MAX_LENGTH,
): string {
  const available = Math.max(0, maxLength - SHIFT_COPY_SUFFIX.length);
  const base = name.trim().slice(0, available).trimEnd();
  return `${base || "Turno"}${SHIFT_COPY_SUFFIX}`;
}

export function minutesBetween(start: string, end: string): number {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  const difference =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  return difference >= 0 ? difference : difference + 24 * 60;
}

export function totalBreakMinutes(
  breaks: { start: string; end: string }[],
): number {
  return breaks.reduce(
    (total, current) => total + minutesBetween(current.start, current.end),
    0,
  );
}

export const defaultShiftType: ShiftTypeInput = {
  name: "",
  color: "#2563eb",
  description: "",
  intervals: [{ start: "08:00", end: "16:00" }],
  breaks: [],
  breakPaid: false,
};
