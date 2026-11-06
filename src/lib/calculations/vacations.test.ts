import { describe, expect, it } from "vitest";
import { buildVacationBalance } from "./vacations";

describe("buildVacationBalance", () => {
  it("calcula los días disponibles restando los utilizados", () => {
    expect(buildVacationBalance(30, 12)).toEqual({
      allocatedDays: 30,
      usedDays: 12,
      remainingDays: 18,
    });
  });

  it("admite saldo negativo si se usan más días de los asignados", () => {
    expect(buildVacationBalance(10, 14)).toEqual({
      allocatedDays: 10,
      usedDays: 14,
      remainingDays: -4,
    });
  });

  it("devuelve cero disponible sin días asignados ni usados", () => {
    expect(buildVacationBalance(0, 0).remainingDays).toBe(0);
  });
});
