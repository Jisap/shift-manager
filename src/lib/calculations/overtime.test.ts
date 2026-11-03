import { describe, expect, it } from "vitest";
import {
  actualMinutesForInterval,
  formatHours,
  localIntervalMinutes,
  overtimeMinutesForIntervals,
} from "./overtime";

describe("formatHours", () => {
  it("formatea horas exactas", () => {
    expect(formatHours(120)).toBe("2 h");
  });

  it("formatea horas y minutos", () => {
    expect(formatHours(90)).toBe("1 h 30 min");
  });
});

describe("localIntervalMinutes", () => {
  it("calcula un tramo dentro del mismo día", () => {
    expect(localIntervalMinutes({ start: "07:00", end: "09:30" })).toBe(150);
  });

  it("cruza medianoche cuando el fin es anterior al inicio", () => {
    expect(localIntervalMinutes({ start: "23:00", end: "01:00" })).toBe(120);
  });

  it("devuelve 0 para tramos incompletos o iguales", () => {
    expect(localIntervalMinutes({ start: "", end: "09:00" })).toBe(0);
    expect(localIntervalMinutes({ start: "09:00", end: "09:00" })).toBe(0);
  });
});

describe("overtimeMinutesForIntervals", () => {
  const timezone = "Europe/Madrid";

  it("suma varios tramos del mismo día", () => {
    const minutes = overtimeMinutesForIntervals(
      "2026-11-02",
      [
        { start: "07:00", end: "08:00" },
        { start: "16:00", end: "18:00" },
      ],
      timezone,
    );
    expect(minutes).toBe(180);
  });

  it("cuenta correctamente un tramo que cruza medianoche", () => {
    const minutes = overtimeMinutesForIntervals(
      "2026-11-02",
      [{ start: "23:00", end: "01:00" }],
      timezone,
    );
    expect(minutes).toBe(120);
  });
});

describe("actualMinutesForInterval", () => {
  const timezone = "Europe/Madrid";

  it("descuenta las pausas del tiempo trabajado", () => {
    expect(
      actualMinutesForInterval("2026-11-02", "08:00", "16:00", 30, timezone),
    ).toBe(450);
  });

  it("nunca devuelve minutos negativos", () => {
    expect(
      actualMinutesForInterval("2026-11-02", "08:00", "09:00", 120, timezone),
    ).toBe(0);
  });

  it("cruza medianoche respetando el día de salida", () => {
    expect(
      actualMinutesForInterval("2026-11-02", "22:00", "06:00", 0, timezone),
    ).toBe(480);
  });

  it("respeta el cambio de horario de primavera", () => {
    expect(
      actualMinutesForInterval("2026-03-28", "22:00", "06:00", 0, timezone),
    ).toBe(420);
  });

  it("respeta el cambio de horario de otoño", () => {
    expect(
      actualMinutesForInterval("2026-10-24", "22:00", "06:00", 0, timezone),
    ).toBe(540);
  });
});
