import { describe, expect, it } from "vitest";
import {
  copyShiftName,
  SHIFT_COPY_SUFFIX,
  SHIFT_NAME_MAX_LENGTH,
} from "./shift";

describe("copyShiftName", () => {
  it("añade el sufijo al nombre original", () => {
    expect(copyShiftName("Mañana")).toBe("Mañana (copia)");
  });

  it("recorta el nombre para respetar el máximo de 60 caracteres", () => {
    const longName = "A".repeat(60);
    const result = copyShiftName(longName);

    expect(result.length).toBe(SHIFT_NAME_MAX_LENGTH);
    expect(result.endsWith(SHIFT_COPY_SUFFIX)).toBe(true);
  });

  it("elimina espacios sobrantes antes de añadir el sufijo", () => {
    expect(copyShiftName("  Tarde  ")).toBe("Tarde (copia)");
  });

  it("usa un nombre por defecto si el original está vacío", () => {
    expect(copyShiftName("   ")).toBe("Turno (copia)");
  });
});
