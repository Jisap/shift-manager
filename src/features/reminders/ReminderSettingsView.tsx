"use client";

/**
 * ReminderSettingsView
 * ----------------------------------------------------------------------------
 * Configura los recordatorios del próximo turno: permiso del navegador,
 * interruptor general, antelación y aviso de cambios. Los ajustes se guardan
 * en Convex; el permiso es local de cada dispositivo.
 *
 * Se compone de dos tarjetas: `PermissionCard` (estado del permiso y prueba) y
 * `ReminderForm` (ajustes guardados). Quien programa y muestra los avisos es
 * `ReminderScheduler`; esta vista solo los configura.
 */

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  HelpCircle,
  Save,
  Send,
} from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";
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
import {
  notificationPermissionSnapshot,
  notificationPermissionServerSnapshot,
  notifyPermissionChanged,
  requestNotificationPermission,
  showBrowserNotification,
  subscribeNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/notifications/browser";
import {
  MAX_LEAD_MINUTES,
  MIN_LEAD_MINUTES,
  reminderSettingsSignature,
  type ReminderSettings,
} from "@/lib/reminders/settings";
import { convexErrorMessage } from "@/lib/utils/convex-error";

/** Opciones rápidas de antelación para facilitar la selección. */
const QUICK_LEAD_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "1 día", minutes: 1440 },
];

/** Metadatos visuales del estado del permiso de notificaciones. */
function permissionBadge(permission: NotificationPermissionState) {
  switch (permission) {
    case "granted":
      return {
        text: "Permiso concedido",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
      };
    case "denied":
      return {
        text: "Permiso bloqueado",
        className: "bg-destructive/15 text-destructive border-destructive/30",
        icon: BellOff,
      };
    case "unsupported":
      return {
        text: "No compatible",
        className: "bg-muted text-muted-foreground border-border",
        icon: AlertCircle,
      };
    default:
      return {
        text: "Pendiente de conceder",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: HelpCircle,
      };
  }
}

export function ReminderSettingsView() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const settings = useQuery(
    api.reminders.getSettings,
    isAuthenticated ? {} : "skip",
  );
  const permission = useSyncExternalStore(
    subscribeNotificationPermission,
    notificationPermissionSnapshot,
    notificationPermissionServerSnapshot,
  );

  async function handleRequestPermission() {
    await requestNotificationPermission();
    notifyPermissionChanged();
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md rounded-2xl shadow-2xs">
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>
            Necesitas una cuenta para configurar tus recordatorios.
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

  return (
    <div className="flex w-full flex-col gap-6">
      <PermissionCard
        permission={permission}
        onRequestPermission={() => void handleRequestPermission()}
      />
      {settings === undefined ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Clock className="size-4 animate-spin" />
          <span>Cargando ajustes…</span>
        </div>
      ) : (
        <ReminderForm settings={settings} permission={permission} />
      )}
    </div>
  );
}

/** Tarjeta refinada con el estado del permiso y acciones asociadas. */
function PermissionCard({
  permission,
  onRequestPermission,
}: {
  permission: NotificationPermissionState;
  onRequestPermission: () => void;
}) {
  const badge = permissionBadge(permission);
  const BadgeIcon = badge.icon;
  const supported = permission !== "unsupported";

  async function handleTestNotification() {
    await showBrowserNotification({
      title: "ShiftManager",
      body: "Las notificaciones funcionan correctamente en este dispositivo.",
      tag: "shiftmanager-test",
      url: "/settings",
    });
  }

  return (
    <Card className="border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BellRing className="size-4" aria-hidden />
            </div>
            Permiso del dispositivo
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              badge.className
            )}
          >
            <BadgeIcon className="size-3.5" />
            {badge.text}
          </span>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Las notificaciones se configuran de forma independiente en cada navegador o dispositivo que utilices.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {permission === "denied" ? (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
            Las notificaciones están bloqueadas en este navegador. Debes hacer clic en el candado o icono de permisos de la barra de direcciones para habilitarlas.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={permission === "granted" ? "outline" : "default"}
            className="gap-1.5 shadow-2xs"
            disabled={
              !supported || permission === "granted" || permission === "denied"
            }
            onClick={onRequestPermission}
          >
            <Bell className="size-4" aria-hidden />
            {permission === "denied"
              ? "Permiso bloqueado"
              : permission === "granted"
                ? "Permiso concedido"
                : "Solicitar permiso"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 shadow-2xs"
            disabled={permission !== "granted"}
            onClick={() => void handleTestNotification()}
          >
            <Send className="size-4 text-primary" aria-hidden />
            Probar notificación
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Formulario de recordatorios estilizado con controles refinados. */
function ReminderForm({
  settings,
  permission,
}: {
  settings: ReminderSettings;
  permission: NotificationPermissionState;
}) {
  const updateSettings = useMutation(api.reminders.updateSettings);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [leadMinutes, setLeadMinutes] = useState(String(settings.leadMinutes));
  const [notifyChanges, setNotifyChanges] = useState(settings.notifyChanges);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [baseSignature, setBaseSignature] = useState(() =>
    reminderSettingsSignature(settings),
  );
  const incomingSignature = reminderSettingsSignature(settings);
  if (baseSignature !== incomingSignature) {
    setBaseSignature(incomingSignature);
    const draftLead =
      leadMinutes.trim() === "" ? Number.NaN : Number(leadMinutes);
    const draftSignature = reminderSettingsSignature({
      enabled,
      leadMinutes: draftLead,
      notifyChanges,
    });
    if (draftSignature !== incomingSignature) {
      setEnabled(settings.enabled);
      setLeadMinutes(String(settings.leadMinutes));
      setNotifyChanges(settings.notifyChanges);
      setSaved(false);
      setError(null);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const minutes = Number(leadMinutes);
    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_LEAD_MINUTES ||
      minutes > MAX_LEAD_MINUTES
    ) {
      setError(
        `La antelación debe ser un entero entre ${MIN_LEAD_MINUTES} y ${MAX_LEAD_MINUTES} minutos.`,
      );
      return;
    }

    setSaving(true);
    try {
      await updateSettings({ enabled, leadMinutes: minutes, notifyChanges });
      setSaved(true);
    } catch (caught) {
      setError(
        convexErrorMessage(caught, "No se pudieron guardar los recordatorios."),
      );
    } finally {
      setSaving(false);
    }
  }

  const currentMinutes = Number(leadMinutes);

  return (
    <Card className="border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="size-4" aria-hidden />
          </div>
          Configuración de avisos
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Los recordatorios se muestran en este dispositivo mientras la aplicación esté abierta o instalada como PWA en segundo plano.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Fila 1: Interruptor general */}
          <div
            onClick={() => {
              setEnabled((prev) => !prev);
              setSaved(false);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all duration-150 select-none",
              enabled
                ? "border-primary/40 bg-primary/5 shadow-2xs"
                : "border-border/70 bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex flex-col gap-0.5 pr-4">
              <Label htmlFor="reminders-enabled" className="cursor-pointer font-semibold text-sm">
                Activar recordatorios
              </Label>
              <p className="text-muted-foreground text-xs">
                Recibe un aviso automático antes del comienzo de cada turno.
              </p>
            </div>
            {/* Switch estilizado */}
            <div
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                enabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </div>
            <input
              id="reminders-enabled"
              type="checkbox"
              checked={enabled}
              onChange={() => {}}
              className="sr-only"
            />
          </div>

          {/* Fila 2: Antelación y opciones rápidas */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminders-lead" className="text-xs font-semibold text-foreground">
                Antelación del aviso
              </Label>
              <span className="text-xs font-medium text-muted-foreground">
                {currentMinutes === 60
                  ? "1 hora antes"
                  : currentMinutes === 120
                    ? "2 horas antes"
                    : currentMinutes === 1440
                      ? "1 día antes"
                      : `${currentMinutes || 0} min antes`}
              </span>
            </div>

            {/* Chips de selección rápida */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_LEAD_PRESETS.map((preset) => {
                const isSelected = currentMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setLeadMinutes(String(preset.minutes));
                      setSaved(false);
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Input manual */}
            <div className="flex items-center gap-2 pt-2">
              <Input
                id="reminders-lead"
                type="number"
                min={MIN_LEAD_MINUTES}
                max={MAX_LEAD_MINUTES}
                step={1}
                value={leadMinutes}
                onChange={(event) => {
                  setLeadMinutes(event.target.value);
                  setSaved(false);
                }}
                className="h-8 w-24 text-center font-medium"
              />
              <span className="text-xs text-muted-foreground">
                minutos exactos ({MIN_LEAD_MINUTES} a {MAX_LEAD_MINUTES})
              </span>
            </div>
          </div>

          {/* Fila 3: Aviso de cambios */}
          <div
            onClick={() => {
              setNotifyChanges((prev) => !prev);
              setSaved(false);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all duration-150 select-none",
              notifyChanges
                ? "border-primary/40 bg-primary/5 shadow-2xs"
                : "border-border/70 bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex flex-col gap-0.5 pr-4">
              <Label htmlFor="reminders-changes" className="cursor-pointer font-semibold text-sm">
                Avisar de cambios en el próximo turno
              </Label>
              <p className="text-muted-foreground text-xs">
                Emite una notificación si un cambio o excepción afecta al turno que estás esperando.
              </p>
            </div>
            {/* Switch estilizado */}
            <div
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                notifyChanges ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  notifyChanges ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </div>
            <input
              id="reminders-changes"
              type="checkbox"
              checked={notifyChanges}
              onChange={() => {}}
              className="sr-only"
            />
          </div>

          {/* Aviso si falta permiso */}
          {permission !== "granted" ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Recuerda autorizar el permiso de notificaciones arriba para que tu dispositivo pueda mostrar los avisos programados.
              </span>
            </div>
          ) : null}

          {/* Mensajes de error o éxito */}
          {error !== null ? (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {saved ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400" role="status">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Ajustes de recordatorios guardados correctamente.</span>
            </div>
          ) : null}

          {/* Botón Guardar */}
          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              className="gap-1.5 shadow-2xs"
              disabled={saving}
            >
              <Save className="size-4" aria-hidden />
              {saving ? "Guardando…" : "Guardar ajustes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
