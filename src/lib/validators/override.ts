import { z } from "zod";

/**
 * Schema Zod del formulario de excepción puntual de un día.
 *
 * - `rest` no necesita turno.
 * - `shift` y `extra` requieren un tipo de turno (el backend también acepta
 *   intervalos explícitos, pero la UI del MVP trabaja con turnos existentes).
 * - Las notas son opcionales y se limitan a 500 caracteres.
 */
export const overrideFormSchema = z
  .object({
    kind: z.enum(["shift", "rest", "extra"]),
    shiftTypeId: z.string().optional(),
    notes: z.string().trim().max(500, "Máximo 500 caracteres"),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== "rest" && !value.shiftTypeId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona un turno",
        path: ["shiftTypeId"],
      });
    }
  });

export type OverrideFormValues = z.infer<typeof overrideFormSchema>;

/** Valores iniciales del formulario de excepción. */
export function defaultOverrideValues(): OverrideFormValues {
  return {
    kind: "rest",
    shiftTypeId: undefined,
    notes: "",
  };
}

/** Etiquetas legibles de los tipos de excepción. */
export const OVERRIDE_KIND_LABELS: Record<OverrideFormValues["kind"], string> = {
  rest: "Descanso",
  shift: "Turno",
  extra: "Extra",
};
