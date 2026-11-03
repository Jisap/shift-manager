import { describe, expect, it } from "vitest";
import {
  classifyDayMinutes,
  emptyClassifiedMinutes,
  sumClassifiedMinutes,
} from "./classification";

describe("classifyDayMinutes", () => {
  it("clasifica como normal un día laborable sin horas extra", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 480,
        overtimeMinutes: 0,
        isHoliday: false,
        isExtraDay: false,
      }),
    ).toEqual({ ...emptyClassifiedMinutes(), normal: 480, total: 480 });
  });

  it("separa las horas extra declaradas de las normales", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 480,
        overtimeMinutes: 60,
        isHoliday: false,
        isExtraDay: false,
      }),
    ).toEqual({
      ...emptyClassifiedMinutes(),
      normal: 420,
      extra: 60,
      total: 480,
    });
  });

  it("clasifica festivo y festivo-extra cuando hay horas extra", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 480,
        overtimeMinutes: 60,
        isHoliday: true,
        isExtraDay: false,
      }),
    ).toEqual({
      ...emptyClassifiedMinutes(),
      holiday: 420,
      holidayExtra: 60,
      total: 480,
    });
  });

  it("cuenta toda la jornada como extra si la excepción es extra", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 300,
        overtimeMinutes: 60,
        isHoliday: false,
        isExtraDay: true,
      }),
    ).toEqual({ ...emptyClassifiedMinutes(), extra: 300, total: 300 });
  });

  it("cuenta como festivo-extra una jornada extra en festivo", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 300,
        overtimeMinutes: 0,
        isHoliday: true,
        isExtraDay: true,
      }),
    ).toEqual({
      ...emptyClassifiedMinutes(),
      holidayExtra: 300,
      total: 300,
    });
  });

  it("usa las horas extra declaradas si no hay registro real", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 0,
        overtimeMinutes: 90,
        isHoliday: false,
        isExtraDay: false,
      }),
    ).toEqual({ ...emptyClassifiedMinutes(), extra: 90, total: 90 });
  });

  it("nunca cuenta más horas extra que minutos reales", () => {
    expect(
      classifyDayMinutes({
        actualMinutes: 120,
        overtimeMinutes: 240,
        isHoliday: false,
        isExtraDay: false,
      }),
    ).toEqual({ ...emptyClassifiedMinutes(), extra: 120, total: 120 });
  });
});

describe("sumClassifiedMinutes", () => {
  it("suma todas las categorías", () => {
    const total = sumClassifiedMinutes([
      { normal: 100, extra: 10, holiday: 20, holidayExtra: 5, total: 135 },
      { normal: 50, extra: 0, holiday: 0, holidayExtra: 15, total: 65 },
    ]);
    expect(total).toEqual({
      normal: 150,
      extra: 10,
      holiday: 20,
      holidayExtra: 20,
      total: 200,
    });
  });

  it("devuelve ceros con una lista vacía", () => {
    expect(sumClassifiedMinutes([])).toEqual(emptyClassifiedMinutes());
  });
});
