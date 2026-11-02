import { describe, expect, it } from "vitest";
import {
  defaultHolidayValues,
  holidayFormSchema,
  HOLIDAY_SCOPE_LABELS,
} from "./holiday";

describe("holidayFormSchema", () => {
  it("acepta un festivo válido", () => {
    const result = holidayFormSchema.safeParse({
      name: "Navidad",
      scope: "national",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un nombre vacío o solo espacios", () => {
    for (const name of ["", "   "]) {
      const result = holidayFormSchema.safeParse({ name, scope: "local" });
      expect(result.success).toBe(false);
    }
  });

  it("rechaza un nombre de más de 80 caracteres", () => {
    const result = holidayFormSchema.safeParse({
      name: "x".repeat(81),
      scope: "regional",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza ámbitos desconocidos", () => {
    const result = holidayFormSchema.safeParse({
      name: "Festivo",
      scope: "provincial",
    });
    expect(result.success).toBe(false);
  });

  it("incluye etiqueta para los cuatro ámbitos", () => {
    expect(Object.keys(HOLIDAY_SCOPE_LABELS)).toEqual([
      "national",
      "regional",
      "local",
      "personal",
    ]);
  });

  it("defaultHolidayValues parte de nacional", () => {
    expect(defaultHolidayValues()).toEqual({
      name: "",
      scope: "national",
    });
  });
});
