import { describe, expect, it } from "vitest";
import { localDateTimeToInstant } from "../engine";
import type { ResolvedDay } from "../engine";
import { buildShiftReminder } from "./schedule";

const TIMEZONE = "Europe/Madrid";

function day(
  date: string,
  kind: "shift" | "rest",
  intervals: { start: string; end: string }[] = [],
  plannedMinutes = 0,
  shiftTypeId?: string,
): ResolvedDay {
  return {
    date,
    kind,
    source: "pattern",
    shiftTypeId,
    intervals,
    plannedMinutes,
  };
}

const morning = [{ start: "08:00", end: "16:00" }];

describe("buildShiftReminder", () => {
  it("programa el aviso con la antelación indicada", () => {
    const now = localDateTimeToInstant("2026-11-07", "09:00", TIMEZONE);
    const plan = buildShiftReminder({
      days: [day("2026-11-08", "shift", morning, 480, "shift-1")],
      timezone: TIMEZONE,
      leadMinutes: 60,
      now,
      today: "2026-11-07",
      shiftNames: new Map([["shift-1", "Mañana"]]),
    });

    expect(plan).toBeDefined();
    expect(plan?.reminderAt).toBe(
      localDateTimeToInstant("2026-11-08", "07:00", TIMEZONE),
    );
    expect(plan?.shiftDate).toBe("2026-11-08");
    expect(plan?.body).toContain("Mañana");
    expect(plan?.body).toContain("mañana");
    expect(plan?.body).toContain("08:00–16:00");
    expect(plan?.url).toBe("/calendar");
  });

  it("ignora los turnos cuyo aviso ya pasó", () => {
    const now = localDateTimeToInstant("2026-11-08", "07:30", TIMEZONE);
    const plan = buildShiftReminder({
      days: [
        day("2026-11-08", "shift", morning, 480),
        day("2026-11-09", "shift", morning, 480),
      ],
      timezone: TIMEZONE,
      leadMinutes: 60,
      now,
      today: "2026-11-08",
    });

    expect(plan?.shiftDate).toBe("2026-11-09");
  });

  it("ignora descansos y turnos sin horario", () => {
    const now = localDateTimeToInstant("2026-11-07", "09:00", TIMEZONE);
    const plan = buildShiftReminder({
      days: [
        day("2026-11-07", "rest"),
        day("2026-11-08", "shift", [], 0),
        day("2026-11-09", "shift", morning, 480),
      ],
      timezone: TIMEZONE,
      leadMinutes: 30,
      now,
      today: "2026-11-07",
    });

    expect(plan?.shiftDate).toBe("2026-11-09");
    expect(plan?.body).toContain("el 9 de noviembre");
  });

  it("devuelve undefined si no hay turnos futuros", () => {
    const now = localDateTimeToInstant("2026-11-07", "09:00", TIMEZONE);
    const plan = buildShiftReminder({
      days: [day("2026-11-07", "rest")],
      timezone: TIMEZONE,
      leadMinutes: 30,
      now,
      today: "2026-11-07",
    });

    expect(plan).toBeUndefined();
  });

  it("respeta el cambio de horario de verano", () => {
    // El 29/03/2026 a las 02:00 se pasa a las 03:00 en Europe/Madrid.
    const now = localDateTimeToInstant("2026-03-28", "12:00", TIMEZONE);
    const plan = buildShiftReminder({
      days: [day("2026-03-29", "shift", morning, 480)],
      timezone: TIMEZONE,
      leadMinutes: 60,
      now,
      today: "2026-03-28",
    });

    expect(plan?.reminderAt).toBe(
      localDateTimeToInstant("2026-03-29", "07:00", TIMEZONE),
    );
  });
});
