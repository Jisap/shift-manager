import { describe, expect, it } from "vitest";
import {
  copyShiftName,
  SHIFT_COPY_SUFFIX,
  SHIFT_NAME_MAX_LENGTH,
  shiftTypeSchema,
  totalBreakMinutes,
} from "./shift";

const validShift = {
  name: "Mañana",
  color: "#2563eb",
  description: "",
  intervals: [{ start: "08:00", end: "16:00" }],
  breaks: [],
  breakPaid: false,
};

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

describe("shiftTypeSchema", () => {
  it("acepta un turno válido y recorta el nombre", () => {
    const result = shiftTypeSchema.safeParse({
      ...validShift,
      name: "  Mañana  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mañana");
    }
  });

  it("rechaza un nombre vacío o demasiado largo", () => {
    expect(
      shiftTypeSchema.safeParse({ ...validShift, name: "   " }).success,
    ).toBe(false);
    expect(
      shiftTypeSchema.safeParse({ ...validShift, name: "A".repeat(61) })
        .success,
    ).toBe(false);
  });

  it("rechaza un color hexadecimal inválido", () => {
    expect(
      shiftTypeSchema.safeParse({ ...validShift, color: "azul" }).success,
    ).toBe(false);
  });

  it("exige entre 1 y 4 intervalos", () => {
    expect(
      shiftTypeSchema.safeParse({ ...validShift, intervals: [] }).success,
    ).toBe(false);
    expect(
      shiftTypeSchema.safeParse({
        ...validShift,
        intervals: Array.from({ length: 5 }, () => ({
          start: "08:00",
          end: "09:00",
        })),
      }).success,
    ).toBe(false);
  });

  it("rechaza intervalos con entrada y salida iguales", () => {
    expect(
      shiftTypeSchema.safeParse({
        ...validShift,
        intervals: [{ start: "08:00", end: "08:00" }],
      }).success,
    ).toBe(false);
  });

  it("rechaza más de 3 descansos", () => {
    expect(
      shiftTypeSchema.safeParse({
        ...validShift,
        breaks: Array.from({ length: 4 }, (_, index) => ({
          start: `${String(10 + index).padStart(2, "0")}:00`,
          end: `${String(10 + index).padStart(2, "0")}:15`,
        })),
      }).success,
    ).toBe(false);
  });
});

describe("totalBreakMinutes", () => {
  it("suma varios descansos", () => {
    expect(
      totalBreakMinutes([
        { start: "10:00", end: "10:15" },
        { start: "13:00", end: "14:00" },
      ]),
    ).toBe(75);
  });

  it("cuenta un descanso que cruza la medianoche", () => {
    expect(totalBreakMinutes([{ start: "23:30", end: "00:30" }])).toBe(60);
  });

  it("devuelve 0 sin descansos", () => {
    expect(totalBreakMinutes([])).toBe(0);
  });
});
