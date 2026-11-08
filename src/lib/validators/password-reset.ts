import { z } from "zod";

/** Longitud del código OTP enviado por email. */
export const PASSWORD_RESET_CODE_LENGTH = 8;

/** Validación del primer paso: solicitar el código por email. */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Introduce tu email")
    .email("El email no es válido"),
});

/** Validación del segundo paso: código OTP y nueva contraseña. */
export const passwordResetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(
        new RegExp(`^\\d{${PASSWORD_RESET_CODE_LENGTH}}$`),
        `El código debe tener ${PASSWORD_RESET_CODE_LENGTH} dígitos`,
      ),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type PasswordResetRequestValues = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetValues = z.infer<typeof passwordResetSchema>;
