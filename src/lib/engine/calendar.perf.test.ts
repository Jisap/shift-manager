// @vitest-environment node

/**
 * Medición de rendimiento del motor de turnos y de las agregaciones del
 * dashboard con un rango de un año (366 días como máximo en la app).
 *
 * No se ejecuta en la suite normal: se activa con `PERF=1`.
 *
 *   PowerShell: $env:PERF=1; npx vitest run src/lib/engine/calendar.perf.test.ts
 *   Bash:       PERF=1 npx vitest run src/lib/engine/calendar.perf.test.ts
 *
 * Cada escenario se ejecuta en caliente durante ~750 ms y se reportan mínimo,
 * mediana, p95, media y operaciones por segundo.
 */

import { describe, expect, it } from "vitest";
import {
  bucketStatistics,
  buildStatistics,
  statisticsBucketSize,
  statisticsRates,
} from "../calculations/statistics";
import { resolveRange } from "./resolve";
import type {
  OverrideDefinition,
  PatternDayDefinition,
  PatternDefinition,
  ShiftTypeDefinition,
} from "./types";

const YEAR_START = "2026-01-01";
const YEAR_END = "2026-12-31";
const TARGET_MS = 750;

const morning: ShiftTypeDefinition = {
  id: "morning",
  intervals: [{ start: "08:00", end: "16:00" }],
  breaks: [{ start: "13:00", end: "14:00" }],
  breakPaid: false,
};

const night: ShiftTypeDefinition = {
  id: "night",
  intervals: [{ start: "22:00", end: "06:00" }],
  breaks: [{ start: "02:00", end: "03:00" }],
  breakPaid: false,
};

const shiftTypes: Record<string, ShiftTypeDefinition> = { morning, night };

const weeklyPattern: PatternDefinition = {
  id: "weekly",
  type: "weekly",
  cycleLength: 7,
  anchorDate: "2025-12-29", // lunes
  startDate: "2025-01-01",
};

const weeklyDays: PatternDayDefinition[] = [
  {
    patternId: "weekly",
    dayIndex: 0,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  {
    patternId: "weekly",
    dayIndex: 1,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  {
    patternId: "weekly",
    dayIndex: 2,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  {
    patternId: "weekly",
    dayIndex: 3,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  {
    patternId: "weekly",
    dayIndex: 4,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  { patternId: "weekly", dayIndex: 5, isRestDay: true },
  { patternId: "weekly", dayIndex: 6, isRestDay: true },
];

const rotatingPattern: PatternDefinition = {
  id: "rotating",
  type: "rotating",
  cycleLength: 4,
  anchorDate: "2026-01-01",
  startDate: "2026-01-01",
};

const rotatingDays: PatternDayDefinition[] = [
  {
    patternId: "rotating",
    dayIndex: 0,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  {
    patternId: "rotating",
    dayIndex: 1,
    isRestDay: false,
    shiftTypeId: "night",
  },
  { patternId: "rotating", dayIndex: 2, isRestDay: true },
  { patternId: "rotating", dayIndex: 3, isRestDay: true },
];

/** 30 excepciones repartidas por el año. */
const overrides: OverrideDefinition[] = Array.from(
  { length: 30 },
  (_, index) => ({
    date: `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String(
      (index % 28) + 1,
    ).padStart(2, "0")}`,
    kind: index % 2 === 0 ? "shift" : "rest",
    shiftTypeId: index % 2 === 0 ? "morning" : undefined,
  }),
);

/**
 * 50 patrones históricos archivados que no cubren 2026 y uno activo que sí.
 * Es el peor caso de la búsqueda del patrón activo por día.
 */
const archivedPatterns: PatternDefinition[] = Array.from(
  { length: 50 },
  (_, index) => ({
    id: `archived-${index}`,
    type: "weekly",
    cycleLength: 7,
    anchorDate: "2025-12-29",
    startDate: `2024-${String((index % 12) + 1).padStart(2, "0")}-01`,
    endDate: `2024-${String((index % 12) + 1).padStart(2, "0")}-28`,
  }),
);
const manyPatterns: PatternDefinition[] = [
  ...archivedPatterns,
  { ...weeklyPattern, id: "active" },
];
const manyPatternDays: PatternDayDefinition[] = manyPatterns.flatMap(
  (pattern) => weeklyDays.map((day) => ({ ...day, patternId: pattern.id })),
);

const yearDays = resolveRange({
  timezone: "Europe/Madrid",
  startDate: YEAR_START,
  endDate: YEAR_END,
  shiftTypes,
  patterns: [weeklyPattern],
  patternDays: weeklyDays,
});

const timeEntries = yearDays
  .filter((day) => day.kind === "shift")
  .slice(0, 200)
  .map((day) => ({
    date: day.date,
    actualStart: day.startInstant ?? 0,
    actualEnd: (day.endInstant ?? 0) + 30 * 60 * 1000,
    breakMinutes: 60,
  }));

const bucketSize = statisticsBucketSize(YEAR_START, YEAR_END);
const holidayDates = new Set(["2026-01-01", "2026-12-25"]);

interface Measurement {
  label: string;
  min: number;
  median: number;
  p95: number;
  mean: number;
  opsPerSecond: number;
  iterations: number;
}

/**
 * Ejecuta `fn` en caliente y devuelve estadísticas de duración en milisegundos.
 * Las primeras 5 ejecuciones sirven de calentamiento y no se contabilizan.
 */
function measure(label: string, fn: () => void): Measurement {
  for (let index = 0; index < 5; index += 1) {
    fn();
  }

  const samples: number[] = [];
  const start = performance.now();
  while (performance.now() - start < TARGET_MS && samples.length < 100_000) {
    const iterationStart = performance.now();
    fn();
    samples.push(performance.now() - iterationStart);
  }

  samples.sort((left, right) => left - right);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const mean = total / samples.length;

  return {
    label,
    min: samples[0] ?? 0,
    median: samples[Math.floor(samples.length / 2)] ?? 0,
    p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
    mean,
    opsPerSecond: 1000 / mean,
    iterations: samples.length,
  };
}

function format(measurement: Measurement): string {
  return [
    measurement.label.padEnd(52),
    `${measurement.min.toFixed(2).padStart(6)} ms`,
    `${measurement.median.toFixed(2).padStart(6)} ms`,
    `${measurement.p95.toFixed(2).padStart(6)} ms`,
    `${measurement.mean.toFixed(2).padStart(6)} ms`,
    `${measurement.opsPerSecond.toFixed(1).padStart(8)} ops/s`,
    `(${measurement.iterations} iter)`,
  ].join("  ");
}

describe.skipIf(!process.env.PERF)("rendimiento del calendario anual", () => {
  it("mide motor y agregaciones", () => {
    const measurements: Measurement[] = [
      measure("resolveRange · semanal + 1 turno", () => {
        resolveRange({
          timezone: "Europe/Madrid",
          startDate: YEAR_START,
          endDate: YEAR_END,
          shiftTypes,
          patterns: [weeklyPattern],
          patternDays: weeklyDays,
        });
      }),
      measure("resolveRange · rotativo + nocturno + 30 excepciones", () => {
        resolveRange({
          timezone: "Europe/Madrid",
          startDate: YEAR_START,
          endDate: YEAR_END,
          shiftTypes,
          patterns: [rotatingPattern],
          patternDays: rotatingDays,
          overrides,
        });
      }),
      measure("resolveRange · 50 patrones históricos (peor caso)", () => {
        resolveRange({
          timezone: "Europe/Madrid",
          startDate: YEAR_START,
          endDate: YEAR_END,
          shiftTypes,
          patterns: manyPatterns,
          patternDays: manyPatternDays,
        });
      }),
      measure("buildStatistics · año completo", () => {
        buildStatistics({
          days: yearDays,
          timeEntries,
          holidayDates,
          extraDates: new Set(),
          vacationDates: new Set(),
        });
      }),
      measure("estadísticas completas + buckets mensuales", () => {
        const summary = buildStatistics({
          days: yearDays,
          timeEntries,
          holidayDates,
          extraDates: new Set(),
          vacationDates: new Set(),
        });
        statisticsRates(summary);
        bucketStatistics(summary.days, bucketSize);
      }),
    ];

    console.log("\nRendimiento (365 días, Europe/Madrid)");
    console.log(
      [
        "escenario".padEnd(52),
        "mínimo".padStart(10),
        "mediana".padStart(10),
        "p95".padStart(10),
        "media".padStart(10),
        "throughput".padStart(12),
      ].join("  "),
    );
    for (const measurement of measurements) {
      console.log(format(measurement));
    }
    console.log("");

    expect(measurements).toHaveLength(5);
  }, 120_000);
});
