// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addLocalDays,
  daysBetweenLocal,
  isValidLocalDate,
  isValidLocalTime,
  rangesOverlap,
  todayInTimezone,
  weekdayOf,
} from "./local-date";

afterEach(() => {
  vi.useRealTimers();
});

describe("fechas locales", () => {
  it("valida fechas YYYY-MM-DD reales", () => {
    expect(isValidLocalDate("2024-02-29")).toBe(true);
    expect(isValidLocalDate("2023-02-29")).toBe(false);
    expect(isValidLocalDate("2024-13-01")).toBe(false);
    expect(isValidLocalDate("2024-1-01")).toBe(false);
    expect(isValidLocalDate("")).toBe(false);
  });

  it("valida horas HH:mm", () => {
    expect(isValidLocalTime("08:00")).toBe(true);
    expect(isValidLocalTime("23:59")).toBe(true);
    expect(isValidLocalTime("24:00")).toBe(false);
    expect(isValidLocalTime("8:00")).toBe(false);
  });

  it("suma días de calendario cruzando mes, año y bisiesto", () => {
    expect(addLocalDays("2024-01-31", 1)).toBe("2024-02-01");
    expect(addLocalDays("2023-12-31", 1)).toBe("2024-01-01");
    expect(addLocalDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addLocalDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("cuenta días de calendario ignorando DST", () => {
    expect(daysBetweenLocal("2024-03-30", "2024-04-01")).toBe(2);
    expect(daysBetweenLocal("2024-10-26", "2024-10-28")).toBe(2);
    expect(daysBetweenLocal("2024-01-02", "2024-01-01")).toBe(-1);
  });

  it("obtiene el día de la semana con lunes = 1", () => {
    expect(weekdayOf("2024-01-01")).toBe(1);
    expect(weekdayOf("2024-01-07")).toBe(0);
  });
});

describe("solapamiento de rangos", () => {
  it("detecta rangos abiertos y cerrados", () => {
    expect(
      rangesOverlap("2024-01-01", "2024-01-10", "2024-01-05", "2024-01-15"),
    ).toBe(true);
    expect(
      rangesOverlap("2024-01-01", undefined, "2024-06-01", undefined),
    ).toBe(true);
    expect(
      rangesOverlap("2024-01-01", "2024-01-10", "2024-01-11", "2024-01-20"),
    ).toBe(false);
    expect(
      rangesOverlap("2024-01-10", "2024-01-10", "2024-01-10", "2024-01-20"),
    ).toBe(true);
  });

  it("ignora rangos vacíos o inválidos", () => {
    expect(
      rangesOverlap("2024-01-10", "2024-01-09", "2024-01-01", "2024-01-20"),
    ).toBe(false);
  });
});

describe("fecha actual por zona", () => {
  it("usa la zona horaria indicada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T23:30:00Z"));

    expect(todayInTimezone("UTC")).toBe("2024-01-01");
    expect(todayInTimezone("Europe/Madrid")).toBe("2024-01-02");
    expect(todayInTimezone("America/New_York")).toBe("2024-01-01");
  });
});
