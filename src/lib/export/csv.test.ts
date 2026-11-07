import { describe, expect, it } from "vitest";
import type { ResolvedDay } from "../engine";
import { buildStatistics } from "../calculations/statistics";
import { buildExportData, categoryLabel } from "./export-data";
import { buildCsv, escapeCsvField, csvFileName, toCsv } from "./csv";

function resolvedDay(
  date: string,
  kind: "shift" | "rest",
  plannedMinutes: number,
  shiftTypeId?: string,
): ResolvedDay {
  return {
    date,
    kind,
    source: "pattern",
    shiftTypeId,
    intervals: kind === "shift" ? [{ start: "08:00", end: "16:00" }] : [],
    plannedMinutes,
  };
}

function exportFixture() {
  const days = [
    resolvedDay("2026-11-02", "shift", 480, "shift-1"),
    resolvedDay("2026-11-03", "rest", 0),
  ];
  const statistics = buildStatistics({
    days,
    timeEntries: [
      {
        date: "2026-11-02",
        actualStart: Date.UTC(2026, 10, 2, 8),
        actualEnd: Date.UTC(2026, 10, 2, 16),
        breakMinutes: 30,
        overtimeMinutes: 30,
      },
    ],
    holidayDates: new Set(),
    extraDates: new Set(),
    vacationDates: new Set(["2026-11-03"]),
  });
  return buildExportData({
    startDate: "2026-11-02",
    endDate: "2026-11-03",
    timezone: "Europe/Madrid",
    days,
    statistics,
    shiftNames: new Map([["shift-1", "Mañana"]]),
    generatedAt: 0,
  });
}

describe("buildExportData", () => {
  it("mapea turnos, descansos y estadísticas por fecha", () => {
    const data = exportFixture();
    expect(data.rows).toHaveLength(2);

    const shift = data.rows[0]!;
    expect(shift.date).toBe("2026-11-02");
    expect(shift.shift).toBe("Mañana");
    expect(shift.intervals).toBe("08:00–16:00");
    expect(shift.actualMinutes).toBe(450);
    expect(shift.category).toBe("Normal + Extra");

    const rest = data.rows[1]!;
    expect(rest.shift).toBe("Descanso");
    expect(rest.intervals).toBe("");
    expect(rest.category).toBe("Vacaciones");
    expect(rest.isVacation).toBe(true);
    expect(rest.differenceMinutes).toBe(0);
  });

  it("copia los totales del resumen", () => {
    const data = exportFixture();
    expect(data.summary.plannedMinutes).toBe(480);
    expect(data.summary.actualMinutes).toBe(450);
    expect(data.summary.overtimeMinutes).toBe(30);
    expect(data.summary.differenceMinutes).toBe(-30);
    expect(data.summary.normalMinutes).toBe(420);
    expect(data.summary.extraMinutes).toBe(30);
    expect(data.summary.vacationDays).toBe(1);
  });
});

describe("categoryLabel", () => {
  it("combina categorías en orden fijo", () => {
    expect(
      categoryLabel({
        date: "2026-11-02",
        plannedMinutes: 0,
        actualMinutes: 60,
        overtimeMinutes: 30,
        differenceMinutes: 0,
        isHoliday: true,
        isExtraDay: false,
        isVacation: false,
        isShift: true,
        normal: 30,
        extra: 0,
        holiday: 0,
        holidayExtra: 30,
        total: 60,
      }),
    ).toBe("Normal + Festivo-extra");
  });
});

describe("escapeCsvField", () => {
  it("no entrecomilla campos simples", () => {
    expect(escapeCsvField("Mañana")).toBe("Mañana");
  });

  it("entrecomilla comas, comillas y saltos de línea", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(escapeCsvField("línea\nnueva")).toBe('"línea\nnueva"');
  });

  it("entrecomilla espacios en los extremos", () => {
    expect(escapeCsvField(" hola ")).toBe('" hola "');
  });
});

describe("toCsv", () => {
  it("une filas con comas y CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d");
  });
});

describe("buildCsv", () => {
  it("incluye BOM, cabecera, filas y total", () => {
    const csv = buildCsv(exportFixture());
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Fecha,Día,Turno,Horario,Horas previstas,Horas reales,Diferencia,Horas extra,Categoría,Festivo,Jornada extra,Vacaciones",
    );
    expect(lines[1]).toContain("2026-11-02");
    expect(lines[1]).toContain("Mañana");
    expect(lines[2]).toContain("Vacaciones");
    expect(lines[3]).toContain("Total");
    expect(lines[3]).toContain("8.00");
  });
});

describe("csvFileName", () => {
  it("usa el rango de fechas", () => {
    expect(csvFileName(exportFixture())).toBe(
      "shiftmanager-2026-11-02_2026-11-03.csv",
    );
  });
});
