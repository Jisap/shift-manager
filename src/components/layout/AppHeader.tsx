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
  Palmtree,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/shifts", label: "Turnos", icon: Clock },
  { href: "/patterns", label: "Patrones", icon: Layers },
  { href: "/vacations", label: "Vacaciones", icon: Palmtree },
  { href: "/settings", label: "Ajustes", icon: Settings },
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

  const isAuthPage = pathname === "/signin";
  // Solo mostramos los enlaces de la app si el usuario está autenticado y no está en la página de login
  const showNavLinks = isAuthenticated && !isAuthPage;

  return (
    <header className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Marca / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-foreground hover:text-primary flex items-center gap-2 font-semibold tracking-tight transition-colors"
          >
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">ShiftManager</span>
          </Link>

          {/* Enlaces de escritorio: solo visibles cuando hay sesión */}
          {showNavLinks ? (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Navegación principal"
            >
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
        <div className="flex items-center gap-2">
          {/* Selector de modo oscuro/claro */}
          <ThemeToggle />

          {isLoading ? (
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="default"
              className="gap-1.5 shadow-xs"
            >
              <Link href="/signin">
                <LogIn className="h-4 w-4" />
                <span>Entrar</span>
              </Link>
            </Button>
          )}

          {/* Botón hamburguesa móvil: solo si hay enlaces que mostrar */}
          {showNavLinks ? (
            <div className="flex md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label="Alternar menú"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Menú desplegable móvil: solo si hay sesión */}
      {mobileMenuOpen && showNavLinks ? (
        <div className="border-border bg-background border-b px-4 py-3 md:hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
