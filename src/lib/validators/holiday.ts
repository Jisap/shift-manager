import { z } from "zod";

/** Ámbitos permitidos para un festivo. */
export const HOLIDAY_SCOPES = [
  "national",
  "regional",
  "local",
  "personal",
] as const;

export type HolidayScope = (typeof HOLIDAY_SCOPES)[number];

/** Etiquetas legibles de los ámbitos de festivo. */
export const HOLIDAY_SCOPE_LABELS: Record<HolidayScope, string> = {
  national: "Nacional",
  regional: "Autonómico",
  local: "Local",
  personal: "Personal",
};

/** Schema Zod del formulario para añadir un festivo. */
export const holidayFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  scope: z.enum(HOLIDAY_SCOPES),
});

export type HolidayFormValues = z.infer<typeof holidayFormSchema>;

/** Valores iniciales del formulario de festivo. */
export function defaultHolidayValues(): HolidayFormValues {
  return {
    name: "",
    scope: "national",
  };
}
