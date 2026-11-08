"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
} from "@/lib/validators/password-reset";

type Flow = "signIn" | "signUp" | "forgot" | "reset";

const FLOW_TITLES: Record<Flow, string> = {
  signIn: "Iniciar sesión",
  signUp: "Crear cuenta",
  forgot: "Recuperar contraseña",
  reset: "Nueva contraseña",
};

export function AuthForm() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Email al que se envió el código, para el segundo paso del restablecimiento.
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (isAuthenticated) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sesión iniciada</CardTitle>
          <CardDescription>
            Tu cuenta está conectada correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/shifts">Gestionar turnos</Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/patterns">Gestionar patrones</Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/calendar">Ver calendario</Link>
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => void signOut()}
          >
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  function changeFlow(next: Flow) {
    setFlow(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    try {
      if (flow === "forgot") {
        const parsed = passwordResetRequestSchema.safeParse({
          email: String(formData.get("email") ?? ""),
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Revisa el email introducido.",
          );
          return;
        }

        formData.set("email", parsed.data.email);
        formData.set("flow", "reset");
        try {
          await signIn("password", formData);
        } catch {
          // No se revela si el email existe: se avanza igualmente al paso del
          // código. Si la cuenta no existe, simplemente no llegará ningún
          // correo y el usuario puede volver atrás.
        }
        setResetEmail(parsed.data.email);
        setFlow("reset");
        return;
      }

      if (flow === "reset") {
        const parsed = passwordResetSchema.safeParse({
          code: String(formData.get("code") ?? ""),
          newPassword: String(formData.get("newPassword") ?? ""),
          confirmPassword: String(formData.get("confirmPassword") ?? ""),
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Revisa los datos introducidos.",
          );
          return;
        }

        formData.set("email", resetEmail ?? "");
        formData.set("code", parsed.data.code);
        formData.set("newPassword", parsed.data.newPassword);
        formData.set("flow", "reset-verification");
        await signIn("password", formData);
        return;
      }

      formData.set("flow", flow);
      await signIn("password", formData);
    } catch {
      setError(
        flow === "forgot"
          ? "No se pudo enviar el código. Comprueba el email e inténtalo de nuevo."
          : flow === "reset"
            ? "No se pudo cambiar la contraseña. Revisa el código e inténtalo de nuevo."
            : "No se pudo completar la operación. Revisa los datos.",
      );
    } finally {
      setPending(false);
    }
  }

  const description =
    flow === "signIn"
      ? "Accede con tu email y contraseña."
      : flow === "signUp"
        ? "Regístrate para empezar a organizar tus turnos."
        : flow === "forgot"
          ? "Introduce tu email y te enviaremos un código para restablecer la contraseña."
          : `Introduce el código enviado a ${resetEmail ?? "tu email"} y elige una nueva contraseña.`;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{FLOW_TITLES[flow]}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {flow !== "reset" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                defaultValue={resetEmail ?? ""}
                required
              />
            </div>
          ) : (
            <input type="hidden" name="email" value={resetEmail ?? ""} />
          )}

          {flow === "signIn" || flow === "signUp" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                {flow === "signIn" ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    onClick={() => changeFlow("forgot")}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                ) : null}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  flow === "signIn" ? "current-password" : "new-password"
                }
                minLength={8}
                required
              />
            </div>
          ) : null}

          {flow === "reset" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Código de verificación</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  placeholder="12345678"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Revisa también la carpeta de spam. El código caduca en 24
                  horas.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Repite la contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </>
          ) : null}

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? flow === "forgot"
                ? "Enviando…"
                : "Procesando…"
              : flow === "signIn"
                ? "Entrar"
                : flow === "signUp"
                  ? "Crear cuenta"
                  : flow === "forgot"
                    ? "Enviar código"
                    : "Cambiar contraseña"}
          </Button>

          {flow === "signIn" || flow === "signUp" ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() =>
                changeFlow(flow === "signIn" ? "signUp" : "signIn")
              }
            >
              {flow === "signIn" ? "No tengo cuenta" : "Ya tengo cuenta"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => changeFlow("signIn")}
            >
              Volver a iniciar sesión
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
