"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutDashboard, LogIn, UserPlus } from "lucide-react";

/**
 * Botones CTA del hero — adaptados según si el usuario está autenticado o no.
 * Se separa en Client Component para no bloquear el Server Component raíz.
 */
export function HeroCta() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div className="h-11 w-40 animate-pulse rounded-lg bg-primary/20" />
        <div className="h-11 w-36 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-11 gap-2 px-6 shadow-sm">
          <Link href="/calendar">
            <CalendarDays className="size-4" />
            Ver mi calendario
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 gap-2 px-6">
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" />
            Ir al Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg" className="h-11 gap-2 px-6 shadow-sm">
        <Link href="/signin">
          <UserPlus className="size-4" />
          Crear cuenta gratis
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-11 gap-2 px-6">
        <Link href="/signin">
          <LogIn className="size-4" />
          Iniciar sesión
        </Link>
      </Button>
    </div>
  );
}

