// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveDay, resolveRange } from "./resolve";
import type {
  PatternDayDefinition,
  PatternDefinition,
  ShiftTypeDefinition,
} from "./types";

const timezone = "Europe/Madrid";

const morning: ShiftTypeDefinition = {
  id: "morning",
  intervals: [{ start: "08:00", end: "16:00" }],
};

const afternoon: ShiftTypeDefinition = {
  id: "afternoon",
  intervals: [{ start: "14:00", end: "22:00" }],
};

const night: ShiftTypeDefinition = {
  id: "night",
  intervals: [{ start: "22:00", end: "06:00" }],
};

const split: ShiftTypeDefinition = {
  id: "split",
  intervals: [
    { start: "09:00", end: "13:00" },
    { start: "16:00", end: "20:00" },
  ],
};

const withUnpaidBreak: ShiftTypeDefinition = {
  id: "withBreak",
  intervals: [{ start: "08:00", end: "16:00" }],
  breaks: [{ start: "12:00", end: "12:30" }],
  breakPaid: false,
};

const withPaidBreak: ShiftTypeDefinition = {
  id: "withPaidBreak",
  intervals: [{ start: "08:00", end: "16:00" }],
  breaks: [{ start: "12:00", end: "12:30" }],
  breakPaid: true,
};

const nightWithBreak: ShiftTypeDefinition = {
  id: "nightWithBreak",
  intervals: [{ start: "22:00", end: "06:00" }],
  breaks: [{ start: "02:00", end: "02:30" }],
  breakPaid: false,
};

const weekly: PatternDefinition = {
  id: "weekly",
  type: "weekly",
  cycleLength: 7,
  anchorDate: "2024-01-01",
  startDate: "2024-01-01",
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
    shiftTypeId: "afternoon",
  },
  { patternId: "weekly", dayIndex: 2, isRestDay: false, shiftTypeId: "night" },
  { patternId: "weekly", dayIndex: 3, isRestDay: false, shiftTypeId: "split" },
  {
    patternId: "weekly",
    dayIndex: 4,
    isRestDay: false,
    shiftTypeId: "morning",
  },
  { patternId: "weekly", dayIndex: 5, isRestDay: true },
  { patternId: "weekly", dayIndex: 6, isRestDay: true },
];

const dailyMorningDays: PatternDayDefinition[] = [0, 1, 2, 3, 4, 5, 6].map(
  (dayIndex) => ({
    patternId: "weekly",
    dayIndex,
    isRestDay: false,
    shiftTypeId: "morning",
  }),
);

const dailyNightDays: PatternDayDefinition[] = [0, 1, 2, 3, 4, 5, 6].map(
  (dayIndex) => ({
    patternId: "weekly",
    dayIndex,
    isRestDay: false,
    shiftTypeId: "night",
  }),
);

const shiftTypes: Record<string, ShiftTypeDefinition> = {
  morning,
  afternoon,
  night,
  split,
  withBreak: withUnpaidBreak,
  withPaidBreak,
  nightWithBreak,
};

function resolveWithWeekly(date: string) {
  return resolveDay({
    timezone,
    date,
    shiftTypes,
    pattern: weekly,
    patternDays: weeklyDays,
  });
}

describe("turnos y jornadas", () => {
  it("1. resuelve un turno de mañana", () => {
    const day = resolveWithWeekly("2024-01-01");
    expect(day).toMatchObject({
      kind: "shift",
      source: "pattern",
      shiftTypeId: "morning",
      plannedMinutes: 480,
    });
  });

  it("2. resuelve un turno de tarde", () => {
    const day = resolveWithWeekly("2024-01-02");
    expect(day.kind).toBe("shift");
    expect(day.shiftTypeId).toBe("afternoon");
    expect(day.plannedMinutes).toBe(480);
  });

  it("3. resuelve un turno nocturno que termina al día siguiente", () => {
    const day = resolveWithWeekly("2024-01-03");
    expect(day.kind).toBe("shift");
    expect(day.plannedMinutes).toBe(480);
    expect((day.endInstant ?? 0) - (day.startInstant ?? 0)).toBe(
      8 * 60 * 60 * 1000,
    );
  });

  it("4. resuelve una jornada partida", () => {
    const day = resolveWithWeekly("2024-01-04");
    expect(day.intervals).toHaveLength(2);
    expect(day.plannedMinutes).toBe(480);
  });

  it("5. resuelve un día de descanso del patrón", () => {
    const day = resolveWithWeekly("2024-01-06");
    expect(day).toMatchObject({
      kind: "rest",
      source: "pattern",
      intervals: [],
      plannedMinutes: 0,
    });
  });

  it("15. descuenta una pausa no remunerada", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: [
        {
          patternId: "weekly",
          dayIndex: 0,
          isRestDay: false,
          shiftTypeId: "withBreak",
        },
      ],
    });
    expect(day.plannedMinutes).toBe(450);
  });

  it("15b. no descuenta una pausa remunerada", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: [
        {
          patternId: "weekly",
          dayIndex: 0,
          isRestDay: false,
          shiftTypeId: "withPaidBreak",
        },
      ],
    });
    expect(day.plannedMinutes).toBe(480);
  });

  it("15c. descuenta una pausa nocturna situada al día siguiente", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: [
        {
          patternId: "weekly",
          dayIndex: 0,
          isRestDay: false,
          shiftTypeId: "nightWithBreak",
        },
      ],
    });
    expect(day.plannedMinutes).toBe(450);
  });

  it("16. no descuenta nada si no hay pausa", () => {
    expect(resolveWithWeekly("2024-01-01").plannedMinutes).toBe(480);
  });
});

describe("patrones", () => {
  it("6. resuelve un ciclo rotativo", () => {
    const rotating: PatternDefinition = {
      id: "rotating",
      type: "rotating",
      cycleLength: 3,
      anchorDate: "2024-01-01",
      startDate: "2024-01-01",
    };
    const days: PatternDayDefinition[] = [
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
        shiftTypeId: "afternoon",
      },
      { patternId: "rotating", dayIndex: 2, isRestDay: true },
    ];

    const result = resolveRange({
      timezone,
      startDate: "2024-01-01",
      endDate: "2024-01-04",
      shiftTypes,
      patterns: [rotating],
      patternDays: days,
    });

    expect(result.map((day) => day.shiftTypeId ?? "rest")).toEqual([
      "morning",
      "afternoon",
      "rest",
      "morning",
    ]);
  });

  it("7. aplica un patrón semanal de lunes a domingo", () => {
    const result = resolveRange({
      timezone,
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      shiftTypes,
      patterns: [weekly],
      patternDays: weeklyDays,
    });

    expect(result.map((day) => day.shiftTypeId ?? "rest")).toEqual([
      "morning",
      "afternoon",
      "night",
      "split",
      "morning",
      "rest",
      "rest",
    ]);
  });

  it("24. usa anchorDate en lunes para el patrón semanal", () => {
    expect(resolveWithWeekly("2024-01-01").shiftTypeId).toBe("morning");
    expect(resolveWithWeekly("2024-01-07").kind).toBe("rest");
  });

  it("21b. conserva el histórico de un patrón archivado", () => {
    const archived: PatternDefinition = {
      ...weekly,
      id: "archived",
      endDate: "2024-01-03",
      archivedAt: 1_700_000_000_000,
    };
    const days: PatternDayDefinition[] = weeklyDays.map((day) => ({
      ...day,
      patternId: "archived",
    }));

    const result = resolveRange({
      timezone,
      startDate: "2024-01-01",
      endDate: "2024-01-04",
      shiftTypes,
      patterns: [archived],
      patternDays: days,
    });

    expect(result[0]?.shiftTypeId).toBe("morning");
    expect(result[2]?.shiftTypeId).toBe("night");
    expect(result[3]).toMatchObject({ kind: "rest", source: "default" });
  });

  it("9 y 21. cambia de patrón sin reescribir el historial", () => {
    const oldPattern: PatternDefinition = {
      id: "old",
      type: "weekly",
      cycleLength: 7,
      anchorDate: "2024-01-01",
      startDate: "2024-01-01",
      endDate: "2024-01-03",
    };
    const newPattern: PatternDefinition = {
      id: "new",
      type: "weekly",
      cycleLength: 7,
      anchorDate: "2024-01-01",
      startDate: "2024-01-04",
    };
    const oldDays: PatternDayDefinition[] = [0, 1, 2, 3, 4, 5, 6].map(
      (dayIndex) => ({
        patternId: "old",
        dayIndex,
        isRestDay: false,
        shiftTypeId: "afternoon",
      }),
    );
    const newDays: PatternDayDefinition[] = [0, 1, 2, 3, 4, 5, 6].map(
      (dayIndex) => ({
        patternId: "new",
        dayIndex,
        isRestDay: false,
        shiftTypeId: "morning",
      }),
    );

    const beforeChange = resolveRange({
      timezone,
      startDate: "2024-01-01",
      endDate: "2024-01-03",
      shiftTypes,
      patterns: [oldPattern],
      patternDays: oldDays,
    });

    const result = resolveRange({
      timezone,
      startDate: "2024-01-01",
      endDate: "2024-01-05",
      shiftTypes,
      patterns: [oldPattern, newPattern],
      patternDays: [...oldDays, ...newDays],
    });

    expect(result.slice(0, 3)).toEqual(beforeChange);
    expect(result.slice(3).map((day) => day.shiftTypeId)).toEqual([
      "morning",
      "morning",
    ]);
  });
});

describe("excepciones", () => {
  it("8. aplica una excepción manual con cambio de turno", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: weeklyDays,
      override: { date: "2024-01-01", kind: "shift", shiftTypeId: "night" },
    });

    expect(day).toMatchObject({
      kind: "shift",
      source: "override",
      shiftTypeId: "night",
      plannedMinutes: 480,
    });
  });

  it("8b. aplica una excepción con intervalos propios", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: weeklyDays,
      override: {
        date: "2024-01-01",
        kind: "shift",
        intervals: [{ start: "10:00", end: "14:00" }],
      },
    });

    expect(day.plannedMinutes).toBe(240);
    expect(day.source).toBe("override");
  });

  it("17. convierte un día de trabajo en descanso", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-01",
      shiftTypes,
      pattern: weekly,
      patternDays: weeklyDays,
      override: { date: "2024-01-01", kind: "rest" },
    });

    expect(day).toMatchObject({
      kind: "rest",
      source: "override",
      plannedMinutes: 0,
    });
  });

  it("18. añade una jornada extraordinaria en un día de descanso", () => {
    const day = resolveDay({
      timezone,
      date: "2024-01-06",
      shiftTypes,
      pattern: weekly,
      patternDays: weeklyDays,
      override: { date: "2024-01-06", kind: "extra", shiftTypeId: "morning" },
    });

    expect(day).toMatchObject({
      kind: "shift",
      source: "override",
      shiftTypeId: "morning",
      plannedMinutes: 480,
    });
  });
});

describe("rangos y calendario", () => {
  it("10. resuelve un rango que cruza de mes", () => {
    const result = resolveRange({
      timezone,
      startDate: "2024-01-30",
      endDate: "2024-02-02",
      shiftTypes,
      patterns: [weekly],
      patternDays: weeklyDays,
    });

    expect(result).toHaveLength(4);
    expect(result[0]?.date).toBe("2024-01-30");
    expect(result[3]?.date).toBe("2024-02-02");
  });

  it("11. resuelve un rango que cruza de año", () => {
    const result = resolveRange({
      timezone,
      startDate: "2023-12-30",
      endDate: "2024-01-02",
      shiftTypes,
      patterns: [weekly],
      patternDays: weeklyDays,
    });

    expect(result).toHaveLength(4);
    expect(result.map((day) => day.date)).toEqual([
      "2023-12-30",
      "2023-12-31",
      "2024-01-01",
      "2024-01-02",
    ]);
  });

  it("12. resuelve el 29 de febrero de un año bisiesto", () => {
    const result = resolveRange({
      timezone,
      startDate: "2024-02-28",
      endDate: "2024-03-01",
      shiftTypes,
      patterns: [weekly],
      patternDays: weeklyDays,
    });

    expect(result.map((day) => day.date)).toEqual([
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
  });

  it("20. devuelve descanso por defecto si no hay patrón activo", () => {
    const day = resolveDay({ timezone, date: "2024-01-01", shiftTypes });
    expect(day).toMatchObject({
      kind: "rest",
      source: "default",
      plannedMinutes: 0,
    });
  });

  it("20b. devuelve descanso si el patrón no cubre la fecha", () => {
    const day = resolveDay({
      timezone,
      date: "2023-12-31",
      shiftTypes,
      pattern: weekly,
      patternDays: weeklyDays,
    });
    expect(day).toMatchObject({ kind: "rest", source: "default" });
  });
});

describe("cambios de horario", () => {
  it("13. mantiene las horas locales de un turno diurno en el cambio de primavera", () => {
    const day = resolveDay({
      timezone,
      date: "2024-03-31",
      shiftTypes,
      pattern: weekly,
      patternDays: dailyMorningDays,
    });
    expect(day.plannedMinutes).toBe(480);
  });

  it("14. mantiene las horas locales de un turno diurno en el cambio de otoño", () => {
    const day = resolveDay({
      timezone,
      date: "2024-10-27",
      shiftTypes,
      pattern: weekly,
      patternDays: dailyMorningDays,
    });
    expect(day.plannedMinutes).toBe(480);
  });

  it("22. un turno nocturno dura 7 horas en el cambio de primavera", () => {
    const day = resolveDay({
      timezone,
      date: "2024-03-30",
      shiftTypes,
      pattern: weekly,
      patternDays: dailyNightDays,
    });
    expect(day.shiftTypeId).toBe("night");
    expect(day.plannedMinutes).toBe(420);
  });

  it("23. un turno nocturno dura 9 horas en el cambio de otoño", () => {
    const day = resolveDay({
      timezone,
      date: "2024-10-26",
      shiftTypes,
      pattern: weekly,
      patternDays: dailyNightDays,
    });
    expect(day.shiftTypeId).toBe("night");
    expect(day.plannedMinutes).toBe(540);
  });
});
