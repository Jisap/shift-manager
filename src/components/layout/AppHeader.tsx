"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  CalendarDays,
  Clock,
  Layers,
  LayoutDashboard,
  LogOut,
  LogIn,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/shifts", label: "Turnos", icon: Clock },
  { href: "/patterns", label: "Patrones", icon: Layers },
];

/**
 * Cabecera principal y barra de navegación de la aplicación (App Shell).
 * Muestra el estado activo de cada ruta, adapta un menú móvil responsive
 * y gestiona el acceso/cierre de sesión sin alterar ninguna lógica.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // En páginas de autenticación directa no mostramos duplicada la cabecera si no es necesario
  const isAuthPage = pathname === "/signin";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Marca / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">ShiftManager</span>
          </Link>

          {/* Enlaces de escritorio */}
          {!isAuthPage ? (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        {/* Acciones de usuario / Login */}
        <div className="hidden items-center gap-2 md:flex">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </Button>
          ) : (
            <Button asChild size="sm" variant="default" className="gap-1.5 shadow-xs">
              <Link href="/signin">
                <LogIn className="h-4 w-4" />
                <span>Entrar</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Botón hamburguesa para móvil */}
        {!isAuthPage ? (
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Alternar menú"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && !isAuthPage ? (
        <div className="border-b border-border bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <div className="mt-2 border-t border-border/60 pt-2">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </Button>
              ) : (
                <Button asChild size="sm" className="w-full justify-start gap-2">
                  <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn className="h-4 w-4" />
                    <span>Entrar</span>
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

