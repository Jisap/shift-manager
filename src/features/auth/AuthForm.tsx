"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Mail,
  UserPlus,
} from "lucide-react";
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
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Clock className="size-4 animate-spin" />
        <span>Cargando…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Card className="w-full max-w-sm rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-lg font-bold">Sesión iniciada</CardTitle>
          <CardDescription className="text-xs">
            Tu cuenta está conectada y sincronizada correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 pt-2">
          <Button asChild className="w-full gap-2 shadow-2xs">
            <Link href="/calendar">
              <CalendarDays className="size-4" />
              <span>Ver calendario</span>
            </Link>
          </Button>
          <Button asChild className="w-full gap-2" variant="outline">
            <Link href="/shifts">
              <Clock className="size-4" />
              <span>Gestionar turnos</span>
            </Link>
          </Button>
          <Button asChild className="w-full gap-2" variant="outline">
            <Link href="/patterns">
              <Layers className="size-4" />
              <span>Gestionar patrones</span>
            </Link>
          </Button>
          <div className="pt-2">
            <Button
              className="w-full gap-2 text-muted-foreground hover:text-destructive"
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
              <span>Cerrar sesión</span>
            </Button>
          </div>
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
          // No se revela si existe para prevenir enumeración
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
    <Card className="w-full max-w-sm rounded-2xl border-border/80 shadow-2xs overflow-hidden">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            {flow === "signIn" ? (
              <LogIn className="size-4" />
            ) : flow === "signUp" ? (
              <UserPlus className="size-4" />
            ) : (
              <KeyRound className="size-4" />
            )}
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{FLOW_TITLES[flow]}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {flow !== "reset" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Mail className="text-muted-foreground size-3.5" />
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email
                </Label>
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                defaultValue={resetEmail ?? ""}
                className="h-9"
                required
              />
            </div>
          ) : (
            <input type="hidden" name="email" value={resetEmail ?? ""} />
          )}

          {flow === "signIn" || flow === "signUp" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="text-muted-foreground size-3.5" />
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Contraseña
                  </Label>
                </div>
                {flow === "signIn" ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="text-[11px] text-primary hover:underline"
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
                className="h-9"
                required
              />
            </div>
          ) : null}

          {flow === "reset" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="text-muted-foreground size-3.5" />
                  <Label htmlFor="code" className="text-xs font-semibold">
                    Código de verificación
                  </Label>
                </div>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  placeholder="12345678"
                  className="h-9 tracking-widest text-center font-mono font-bold"
                  required
                />
                <p className="text-muted-foreground text-[11px]">
                  Revisa también la carpeta de spam. El código caduca en 24 horas.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold">
                  Nueva contraseña
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-9"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Repite la contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-9"
                  required
                />
              </div>
            </>
          ) : null}

          {error ? (
            <div
              className="bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-2 rounded-xl border p-2.5 text-xs"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full shadow-2xs h-9 mt-1" disabled={pending}>
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

          <div className="border-t border-border/60 pt-3 text-center">
            {flow === "signIn" || flow === "signUp" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
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
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => changeFlow("signIn")}
              >
                Volver a iniciar sesión
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
