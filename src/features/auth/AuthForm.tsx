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

type Flow = "signIn" | "signUp";

export function AuthForm() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch {
      setError("No se pudo completar la operación. Revisa los datos.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {flow === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
        </CardTitle>
        <CardDescription>
          {flow === "signIn"
            ? "Accede con tu email y contraseña."
            : "Regístrate para empezar a organizar tus turnos."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
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
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Procesando…"
              : flow === "signIn"
                ? "Entrar"
                : "Crear cuenta"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "No tengo cuenta" : "Ya tengo cuenta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
