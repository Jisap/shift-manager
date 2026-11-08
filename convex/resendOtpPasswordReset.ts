import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";

/**
 * Envío del código OTP para restablecer la contraseña.
 *
 * Se configura como proveedor `reset` del proveedor `Password` de Convex Auth.
 * El código se genera con 8 dígitos y se envía por Resend. Las credenciales
 * viven en variables de entorno del deployment de Convex:
 * - `AUTH_RESEND_KEY`: API key de Resend.
 * - `AUTH_EMAIL_FROM`: remitente verificado, por ejemplo
 *   `ShiftManager <no-reply@tudominio.com>`.
 */

const OTP_LENGTH = 8;
const OTP_ALPHABET = "0123456789";
const OTP_MAX_AGE_SECONDS = 24 * 60 * 60;
const FALLBACK_FROM = "ShiftManager <onboarding@resend.dev>";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  from: process.env.AUTH_EMAIL_FROM ?? FALLBACK_FROM,
  maxAge: OTP_MAX_AGE_SECONDS,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, OTP_ALPHABET, OTP_LENGTH);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const apiKey = provider.apiKey ?? process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error("Falta configurar AUTH_RESEND_KEY");
    }

    const from = provider.from ?? process.env.AUTH_EMAIL_FROM ?? FALLBACK_FROM;
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: "Restablece tu contraseña en ShiftManager",
      text: [
        "Has solicitado restablecer tu contraseña en ShiftManager.",
        "",
        `Tu código es: ${token}`,
        "",
        "El código caduca en 24 horas. Si no lo has solicitado, ignora este correo.",
      ].join("\n"),
      html: `
        <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h1 style="font-size: 20px; margin: 0 0 16px;">ShiftManager</h1>
          <p style="margin: 0 0 16px; line-height: 1.5;">Has solicitado restablecer tu contraseña. Introduce este código en la aplicación:</p>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0 0 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 12px; text-align: center;">${token}</p>
          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">El código caduca en 24 horas. Si no lo has solicitado, ignora este correo.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error("No se pudo enviar el código de recuperación");
    }
  },
});
