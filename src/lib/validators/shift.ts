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
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal no válido"),
  description: z.string().trim().max(200, "Máximo 200 caracteres").optional(),
  intervals: z
    .array(shiftIntervalSchema)
    .min(1, "Añade al menos un intervalo")
    .max(4, "Máximo 4 intervalos"),
  breakMinutes: z
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(480, "Máximo 480 minutos"),
  breakPaid: z.boolean(),
});

export type ShiftTypeInput = z.infer<typeof shiftTypeSchema>;

export const defaultShiftType: ShiftTypeInput = {
  name: "",
  color: "#2563eb",
  description: "",
  intervals: [{ start: "08:00", end: "16:00" }],
  breakMinutes: 0,
  breakPaid: false,
};
