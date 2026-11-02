import { describe, expect, it } from "vitest";
import {
  defaultOverrideValues,
  overrideFormSchema,
} from "./override";

describe("overrideFormSchema", () => {
  it("acepta un descanso sin turno", () => {
    const result = overrideFormSchema.safeParse({
      kind: "rest",
      notes: "Vacaciones",
    });
    expect(result.success).toBe(true);
  });

  it("exige un turno para shift y extra", () => {
    for (const kind of ["shift", "extra"] as const) {
      const result = overrideFormSchema.safeParse({ kind, notes: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(["shiftTypeId"]);
      }
    }
  });

  it("acepta un turno con notas", () => {
    const result = overrideFormSchema.safeParse({
      kind: "shift",
      shiftTypeId: "shift-id",
      notes: "Cambio con compañero",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza notas de más de 500 caracteres", () => {
    const result = overrideFormSchema.safeParse({
      kind: "rest",
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("defaultOverrideValues empieza como descanso y sin notas", () => {
    expect(defaultOverrideValues()).toEqual({
      kind: "rest",
      shiftTypeId: undefined,
      notes: "",
    });
  });
});
