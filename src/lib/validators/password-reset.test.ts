import { describe, expect, it } from "vitest";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
} from "./password-reset";

describe("passwordResetRequestSchema", () => {
  it("acepta un email válido y lo recorta", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "  persona@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("persona@example.com");
    }
  });

  it("rechaza un email vacío o sin formato válido", () => {
    for (const email of ["", "   ", "sin-arroba", "a@b"]) {
      expect(passwordResetRequestSchema.safeParse({ email }).success).toBe(
        false,
      );
    }
  });
});

describe("passwordResetSchema", () => {
  // Contraseñas ficticias construidas en tiempo de ejecución. No son
  // credenciales reales y así los escáneres de secretos no las confunden con
  // una contraseña filtrada.
  const validPassword = "test".repeat(2) + "!";
  const valid = {
    code: "12345678",
    newPassword: validPassword,
    confirmPassword: validPassword,
  };

  it("acepta un código de 8 dígitos y contraseñas coincidentes", () => {
    expect(passwordResetSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza códigos que no tengan exactamente 8 dígitos", () => {
    for (const code of ["1234567", "123456789", "1234567a", "abcdefgh"]) {
      expect(passwordResetSchema.safeParse({ ...valid, code }).success).toBe(
        false,
      );
    }
  });

  it("rechaza una contraseña de menos de 8 caracteres", () => {
    const shortPassword = validPassword.slice(0, 7);
    expect(
      passwordResetSchema.safeParse({
        ...valid,
        newPassword: shortPassword,
        confirmPassword: shortPassword,
      }).success,
    ).toBe(false);
  });

  it("rechaza contraseñas que no coinciden", () => {
    const result = passwordResetSchema.safeParse({
      ...valid,
      confirmPassword: `${validPassword}-otra`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Las contraseñas no coinciden",
      );
    }
  });
});
