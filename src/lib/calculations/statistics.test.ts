import { describe, expect, it } from "vitest";
import type { ResolvedDay } from "../engine";
import {
  actualMinutesOfEntry,
  bucketStatistics,
  buildStatistics,
  emptyStatisticsSummary,
  statisticsBucketSize,
  statisticsRates,
  type StatisticsDay,
} from "./statistics";

function resolvedDay(
  date: string,
  kind: "shift" | "rest",
  plannedMinutes: number,
): ResolvedDay {
  return {
    date,
    kind,
    source: "pattern",
    intervals: kind === "shift" ? [{ start: "08:00", end: "16:00" }] : [],
    plannedMinutes,
  };
}

function statisticsDay(
  date: string,
  plannedMinutes: number,
  actualMinutes: number,
): StatisticsDay {
  return {
    date,
    plannedMinutes,
    actualMinutes,
    overtimeMinutes: 0,
    differenceMinutes: actualMinutes - plannedMinutes,
    isHoliday: false,
    isExtraDay: false,
    isShift: plannedMinutes > 0,
    normal: actualMinutes,
    extra: 0,
    holiday: 0,
    holidayExtra: 0,
    total: actualMinutes,
  };
}

describe("actualMinutesOfEntry", () => {
  it("descuenta la pausa de la duración entre instantes", () => {
    expect(
      actualMinutesOfEntry({
        date: "2026-11-02",
        actualStart: Date.UTC(2026, 10, 2, 8),
        actualEnd: Date.UTC(2026, 10, 2, 16),
        breakMinutes: 30,
      }),
    ).toBe(450);
  });

  it("devuelve 0 si el registro no tiene horas reales", () => {
    expect(
      actualMinutesOfEntry({
        date: "2026-11-02",
        breakMinutes: 0,
        overtimeMinutes: 60,
      }),
    ).toBe(0);
  });
});

describe("buildStatistics", () => {
  it("suma previstas, reales, extra y clasifica por categoría", () => {
    const summary = buildStatistics({
      days: [
        resolvedDay("2026-11-02", "shift", 480),
        resolvedDay("2026-11-03", "rest", 0),
        resolvedDay("2026-11-04", "shift", 480),
        resolvedDay("2026-11-05", "rest", 0),
      ],
      timeEntries: [
        {
          date: "2026-11-02",
          actualStart: Date.UTC(2026, 10, 2, 8),
          actualEnd: Date.UTC(2026, 10, 2, 16),
          breakMinutes: 30,
          overtimeMinutes: 60,
        },
        {
          date: "2026-11-04",
          actualStart: Date.UTC(2026, 10, 4, 8),
          actualEnd: Date.UTC(2026, 10, 4, 16),
          breakMinutes: 0,
        },
        {
          date: "2026-11-05",
          breakMinutes: 0,
          overtimeMinutes: 120,
        },
      ],
      holidayDates: new Set(["2026-11-04"]),
      extraDates: new Set(["2026-11-05"]),
    });

    expect(summary.plannedMinutes).toBe(960);
    expect(summary.actualMinutes).toBe(930);
    expect(summary.overtimeMinutes).toBe(180);
    expect(summary.differenceMinutes).toBe(-30);
    expect(summary.shiftDays).toBe(2);
    expect(summary.restDays).toBe(2);
    expect(summary.holidayDays).toBe(1);
    expect(summary.recordedDays).toBe(2);
    expect(summary.classified.normal).toBe(390);
    expect(summary.classified.extra).toBe(180);
    expect(summary.classified.holiday).toBe(480);
    expect(summary.classified.holidayExtra).toBe(0);
    expect(summary.classified.total).toBe(1050);
    expect(summary.days).toHaveLength(4);
  });

  it("devuelve un resumen vacío sin días", () => {
    const summary = buildStatistics({
      days: [],
      timeEntries: [],
      holidayDates: new Set(),
      extraDates: new Set(),
    });
    expect(summary).toEqual(emptyStatisticsSummary());
  });
});

describe("statisticsRates", () => {
  it("calcula cumplimiento, medias y peso de las horas extra", () => {
    const rates = statisticsRates({
      plannedMinutes: 960,
      actualMinutes: 930,
      overtimeMinutes: 180,
      shiftDays: 2,
      recordedDays: 3,
    });

    expect(rates.compliancePercent).toBe(96.9);
    expect(rates.averagePlannedPerShiftDay).toBe(480);
    expect(rates.averageActualPerRecordedDay).toBe(310);
    expect(rates.overtimeSharePercent).toBe(19.4);
  });

  it("devuelve null cuando no hay datos para el denominador", () => {
    const rates = statisticsRates({
      plannedMinutes: 0,
      actualMinutes: 0,
      overtimeMinutes: 0,
      shiftDays: 0,
      recordedDays: 0,
    });

    expect(rates).toEqual({
      compliancePercent: null,
      averagePlannedPerShiftDay: null,
      averageActualPerRecordedDay: null,
      overtimeSharePercent: null,
    });
  });

  it("distingue cero real de ausencia de previstas", () => {
    const rates = statisticsRates({
      plannedMinutes: 480,
      actualMinutes: 0,
      overtimeMinutes: 0,
      shiftDays: 1,
      recordedDays: 0,
    });

    expect(rates.compliancePercent).toBe(0);
    expect(rates.averageActualPerRecordedDay).toBeNull();
    expect(rates.overtimeSharePercent).toBeNull();
  });
});

describe("statisticsBucketSize", () => {
  it("usa días hasta 31 días", () => {
    expect(statisticsBucketSize("2026-11-01", "2026-12-01")).toBe("day");
  });

  it("usa semanas hasta 120 días", () => {
    expect(statisticsBucketSize("2026-11-01", "2026-12-02")).toBe("week");
    expect(statisticsBucketSize("2026-01-01", "2026-04-30")).toBe("week");
  });

  it("usa meses para periodos largos", () => {
    expect(statisticsBucketSize("2026-01-01", "2026-05-01")).toBe("month");
  });
});

describe("bucketStatistics", () => {
  const days = [
    statisticsDay("2026-11-02", 480, 480),
    statisticsDay("2026-11-04", 480, 420),
    statisticsDay("2026-11-09", 240, 240),
    statisticsDay("2026-12-01", 480, 480),
  ];

  it("agrupa por día", () => {
    const buckets = bucketStatistics(days, "day");
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-12-01",
    ]);
    expect(buckets[1]?.differenceMinutes).toBe(-60);
  });

  it("agrupa por semana empezando en lunes", () => {
    const buckets = bucketStatistics(days, "week");
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-30",
    ]);
    expect(buckets[0]?.plannedMinutes).toBe(960);
    expect(buckets[0]?.actualMinutes).toBe(900);
  });

  it("agrupa por mes", () => {
    const buckets = bucketStatistics(days, "month");
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-11", "2026-12"]);
    expect(buckets[0]?.plannedMinutes).toBe(1200);
  });
});
