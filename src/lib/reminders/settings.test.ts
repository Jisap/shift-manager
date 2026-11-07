import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_SETTINGS,
  MAX_LEAD_MINUTES,
  MIN_LEAD_MINUTES,
  isValidLeadMinutes,
  validateReminderSettings,
} from "./settings";

describe("reminder settings", () => {
  it("empieza desactivado con 30 minutos de antelación", () => {
    expect(DEFAULT_REMINDER_SETTINGS).toEqual({
      enabled: false,
      leadMinutes: 30,
      notifyChanges: true,
    });
  });

  it("acepta los extremos del rango de antelación", () => {
    expect(isValidLeadMinutes(MIN_LEAD_MINUTES)).toBe(true);
    expect(isValidLeadMinutes(MAX_LEAD_MINUTES)).toBe(true);
    expect(isValidLeadMinutes(30)).toBe(true);
  });

  it("rechaza antelaciones fuera de rango o no enteras", () => {
    expect(isValidLeadMinutes(-1)).toBe(false);
    expect(isValidLeadMinutes(MAX_LEAD_MINUTES + 1)).toBe(false);
    expect(isValidLeadMinutes(30.5)).toBe(false);
    expect(isValidLeadMinutes(Number.NaN)).toBe(false);
  });

  it("valida los ajustes completos", () => {
    expect(validateReminderSettings(DEFAULT_REMINDER_SETTINGS)).toBeNull();
    expect(
      validateReminderSettings({
        enabled: true,
        leadMinutes: MAX_LEAD_MINUTES + 1,
        notifyChanges: true,
      }),
    ).toContain("antelación");
  });
});
