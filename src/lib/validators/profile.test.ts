import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  defaultProfileValues,
  isValidTimezone,
  normalizeTimezone,
  profileFormSchema,
  validateProfileInput,
} from "./profile";

describe("isValidTimezone", () => {
  it("acepta zonas horarias IANA habituales", () => {
    for (const timezone of ["Europe/Madrid", "Atlantic/Canary", "UTC"]) {
      expect(isValidTimezone(timezone)).toBe(true);
    }
  });

  it("rechaza zonas desconocidas o vacías", () => {
    for (const timezone of ["", "   ", "Marte/Olympus"]) {
      expect(isValidTimezone(timezone)).toBe(false);
    }
  });
});

describe("normalizeTimezone", () => {
  it("conserva una zona válida", () => {
    expect(normalizeTimezone("Europe/London")).toBe("Europe/London");
  });

  it("usa Europe/Madrid si falta o no es válida", () => {
    expect(normalizeTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(normalizeTimezone("Marte/Olympus")).toBe(DEFAULT_TIMEZONE);
  });
});

describe("profileFormSchema", () => {
  it("acepta un perfil válido y recorta el nombre", () => {
    const result = profileFormSchema.safeParse({
      name: "  Jorge  ",
      timezone: "Europe/Madrid",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jorge");
    }
  });

  it("acepta un nombre vacío", () => {
    const result = profileFormSchema.safeParse({
      name: "",
      timezone: "Europe/Madrid",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un nombre de más de 80 caracteres", () => {
    const result = profileFormSchema.safeParse({
      name: "x".repeat(81),
      timezone: "Europe/Madrid",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza una zona horaria inválida", () => {
    const result = profileFormSchema.safeParse({
      name: "Jorge",
      timezone: "Marte/Olympus",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateProfileInput", () => {
  it("devuelve null con datos válidos", () => {
    expect(
      validateProfileInput({ name: "Jorge", timezone: "Europe/Madrid" }),
    ).toBeNull();
  });

  it("devuelve un mensaje con una zona inválida", () => {
    expect(
      validateProfileInput({ name: "Jorge", timezone: "Marte/Olympus" }),
    ).toBe("Selecciona una zona horaria válida");
  });
});

describe("defaultProfileValues", () => {
  it("parte de nombre vacío y Europe/Madrid", () => {
    expect(defaultProfileValues()).toEqual({
      name: "",
      timezone: DEFAULT_TIMEZONE,
    });
  });
});
