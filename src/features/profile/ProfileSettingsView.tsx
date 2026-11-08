"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe2,
  Mail,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "../../../convex/_generated/api";
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
import { cn } from "@/lib/utils";
import { convexErrorMessage } from "@/lib/utils/convex-error";
import {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  profileFormSchema,
  type ProfileFormValues,
  type UserProfile,
} from "@/lib/validators/profile";

/** Zonas habituales cuando el navegador no expone `Intl.supportedValuesOf`. */
const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/Madrid",
  "Atlantic/Canary",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Africa/Casablanca",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
];

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function timezoneOptions(current: string): string[] {
  const intl = Intl as IntlWithSupportedValues;
  const supported = intl.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES;
  return Array.from(new Set([DEFAULT_TIMEZONE, current, ...supported]))
    .filter(isValidTimezone)
    .sort((left, right) => left.localeCompare(right));
}

export function ProfileSettingsView() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(api.users.getProfile, isAuthenticated ? {} : "skip");

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md rounded-2xl shadow-2xs">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para editar tu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/signin">Ir a iniciar sesión</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (profile === undefined) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Clock className="size-4 animate-spin" />
        <span>Cargando perfil…</span>
      </div>
    );
  }

  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      name: profile.name,
      timezone: profile.timezone,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const timezones = useMemo(
    () => timezoneOptions(profile.timezone),
    [profile.timezone],
  );

  async function handleSubmit(values: ProfileFormValues) {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile(values);
      setSaved(true);
    } catch (caught) {
      setError(convexErrorMessage(caught, "No se pudo guardar el perfil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/80 overflow-hidden rounded-2xl shadow-2xs">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <UserRound className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Perfil y configuración regional
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Tu identidad en la app y la zona horaria utilizada en los turnos y cálculos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(handleSubmit)}
          onChange={() => setSaved(false)}
        >
          {/* Fila informativa de la cuenta */}
          {profile.email.length > 0 ? (
            <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
              <Mail className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <div className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="text-muted-foreground font-medium">Cuenta vinculada:</span>
                <span className="font-semibold text-foreground">{profile.email}</span>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nombre */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-name" className="text-xs font-semibold">
                Nombre de visualización
              </Label>
              <Input
                id="profile-name"
                placeholder="Tu nombre o alias"
                autoComplete="name"
                className="h-9"
                aria-invalid={form.formState.errors.name ? true : undefined}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-destructive text-xs" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Opcional; se usa para identificarte en la interfaz.
                </p>
              )}
            </div>

            {/* Zona horaria */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="text-muted-foreground size-3.5" aria-hidden />
                <Label htmlFor="profile-timezone" className="text-xs font-semibold">
                  Zona horaria
                </Label>
              </div>
              <div className="relative">
                <select
                  id="profile-timezone"
                  className={cn(
                    "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30",
                    "h-9 w-full min-w-0 rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors",
                    "focus-visible:ring-3 cursor-pointer"
                  )}
                  aria-invalid={form.formState.errors.timezone ? true : undefined}
                  {...form.register("timezone")}
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz} className="bg-background text-foreground">
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              {form.formState.errors.timezone ? (
                <p className="text-destructive text-xs" role="alert">
                  {form.formState.errors.timezone.message}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Afecta a la resolución del calendario y los recordatorios.
                </p>
              )}
            </div>
          </div>

          {/* Idioma y formato regional */}
          <div className="border-border/70 bg-muted/20 flex items-start gap-3 rounded-xl border p-3.5">
            <div className="bg-background border-border/80 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
              <Globe2 className="text-primary size-4" aria-hidden />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">
                  Idioma y formato regional
                </Label>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                  {profile.locale}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Actualmente optimizado en español estándar (es-ES).
              </p>
            </div>
          </div>

          {/* Errores y confirmación */}
          {error !== null ? (
            <div
              className="bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-2 rounded-xl border p-3 text-xs"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {saved ? (
            <div
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
              role="status"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Perfil guardado correctamente.</span>
            </div>
          ) : null}

          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              className="gap-1.5 shadow-2xs"
              disabled={saving}
            >
              <Save className="size-4" aria-hidden />
              {saving ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
