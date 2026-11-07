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
import { Bell, BellRing, Save, Send } from "lucide-react";
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
  type ReminderSettings,
} from "@/lib/reminders/settings";
import { convexErrorMessage } from "@/lib/utils/convex-error";

/** Texto y color del estado del permiso de notificaciones. */
function permissionLabel(permission: NotificationPermissionState): {
  text: string;
  tone: string;
} {
  switch (permission) {
    case "granted":
      return { text: "Permiso concedido", tone: "text-emerald-600" };
    case "denied":
      return {
        text: "Permiso bloqueado. Actívalo en los ajustes del navegador.",
        tone: "text-destructive",
      };
    case "unsupported":
      return {
        text: "Este navegador no admite notificaciones.",
        tone: "text-muted-foreground",
      };
    // Estado "default": el usuario aún no ha respondido a la petición.
    default:
      return {
        text: "Todavía no has concedido permiso.",
        tone: "text-muted-foreground",
      };
  }
}

export function ReminderSettingsView() {
  // Estado de la sesión de Convex. Sin sesión no se lanzan las queries.
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Ajustes guardados del usuario (`undefined` mientras cargan).
  const settings = useQuery(
    api.reminders.getSettings,
    isAuthenticated ? {} : "skip",
  );
  // El permiso es un sistema externo: `useSyncExternalStore` evita leerlo
  // durante el renderizado del servidor y mantiene la interfaz al día.
  const permission = useSyncExternalStore(
    subscribeNotificationPermission,
    notificationPermissionSnapshot,
    notificationPermissionServerSnapshot,
  );

  // Pide el permiso al navegador y avisa a los suscriptores del cambio: la API
  // de permisos no siempre emite un evento, así que se notifica a mano para
  // que la interfaz se actualice al instante.
  async function handleRequestPermission() {
    await requestNotificationPermission();
    notifyPermissionChanged();
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
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
      {/* El formulario solo se monta cuando ya hay ajustes: así sus campos
          nacen con los valores guardados. */}
      {settings === undefined ? (
        <p className="text-muted-foreground text-sm">Cargando ajustes…</p>
      ) : (
        <ReminderForm settings={settings} permission={permission} />
      )}
    </div>
  );
}

/** Tarjeta con el estado del permiso y las acciones asociadas. */
function PermissionCard({
  permission,
  onRequestPermission,
}: {
  permission: NotificationPermissionState;
  onRequestPermission: () => void;
}) {
  const status = permissionLabel(permission);
  const supported = permission !== "unsupported";

  // Lanza una notificación de ejemplo para comprobar que el permiso, el
  // navegador y el service worker funcionan. Al pulsarla abre `/settings`.
  async function handleTestNotification() {
    await showBrowserNotification({
      title: "ShiftManager",
      body: "Las notificaciones funcionan correctamente.",
      tag: "shiftmanager-test",
      url: "/settings",
    });
  }

  return (
    <Card className="border-border/70 rounded-2xl shadow-2xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="text-primary size-4" aria-hidden />
          Permiso del navegador
        </CardTitle>
        <CardDescription>
          Las notificaciones se conceden por dispositivo. Debes permitirlas en
          cada navegador o instalación donde quieras recibirlas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Estado actual del permiso, con color según el caso */}
        <p className={`text-sm font-medium ${status.tone}`}>{status.text}</p>
        <div className="flex flex-wrap items-center gap-2">
          {/* Pedir permiso: se desactiva si el navegador no lo admite o si ya
              está concedido. Si está bloqueado, el texto del botón cambia. */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!supported || permission === "granted"}
            onClick={onRequestPermission}
          >
            <Bell className="size-4" aria-hidden />
            {permission === "denied"
              ? "Revisar permisos"
              : "Permitir notificaciones"}
          </Button>
          {/* Notificación de prueba: solo con el permiso concedido */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5"
            disabled={permission !== "granted"}
            onClick={() => void handleTestNotification()}
          >
            <Send className="size-4" aria-hidden />
            Probar notificación
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Formulario de recordatorios. Solo se monta cuando ya hay ajustes. */
function ReminderForm({
  settings,
  permission,
}: {
  settings: ReminderSettings;
  permission: NotificationPermissionState;
}) {
  const updateSettings = useMutation(api.reminders.updateSettings);
  // Los campos parten de los ajustes guardados. La antelación se guarda como
  // texto para poder editar el input libremente y se convierte al validar.
  const [enabled, setEnabled] = useState(settings.enabled);
  const [leadMinutes, setLeadMinutes] = useState(String(settings.leadMinutes));
  const [notifyChanges, setNotifyChanges] = useState(settings.notifyChanges);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Indica que el último guardado salió bien; se apaga al tocar cualquier campo.
  const [saved, setSaved] = useState(false);

  /**
   * Valida la antelación en el cliente (entero dentro de los límites) y, si es
   * correcta, guarda los ajustes en Convex.
   */
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

  return (
    <Card className="border-border/70 rounded-2xl shadow-2xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="text-primary size-4" aria-hidden />
          Recordatorios de turno
        </CardTitle>
        <CardDescription>
          El aviso se muestra mientras ShiftManager esté abierto o instalado en
          segundo plano. No se envían notificaciones con la aplicación
          completamente cerrada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Interruptor general de recordatorios. Cada cambio de campo
              apaga el mensaje "guardado" para no dar una confirmación vieja. */}
          <div className="flex items-start gap-3">
            <input
              id="reminders-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked);
                setSaved(false);
              }}
              className="accent-primary mt-0.5 size-4"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="reminders-enabled">Activar recordatorios</Label>
              <p className="text-muted-foreground text-xs">
                Avisa antes de que empiece el próximo turno.
              </p>
            </div>
          </div>

          {/* Antelación en minutos, limitada por MIN/MAX_LEAD_MINUTES */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="reminders-lead" className="text-xs">
              Antelación (minutos)
            </Label>
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
              className="h-9 w-32"
            />
            <p className="text-muted-foreground text-xs">
              Entre {MIN_LEAD_MINUTES} y {MAX_LEAD_MINUTES} minutos antes del
              inicio.
            </p>
          </div>

          {/* Aviso cuando cambia el próximo turno (solo con la app abierta) */}
          <div className="flex items-start gap-3">
            <input
              id="reminders-changes"
              type="checkbox"
              checked={notifyChanges}
              onChange={(event) => {
                setNotifyChanges(event.target.checked);
                setSaved(false);
              }}
              className="accent-primary mt-0.5 size-4"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="reminders-changes">
                Avisar de cambios en el próximo turno
              </Label>
              <p className="text-muted-foreground text-xs">
                Solo se comprueba mientras la aplicación está abierta.
              </p>
            </div>
          </div>

          {/* Recordatorio de que sin permiso los avisos no se pueden mostrar,
              aunque los ajustes se guarden igualmente */}
          {permission !== "granted" ? (
            <p className="text-muted-foreground text-xs">
              Concede el permiso de notificaciones para que los avisos puedan
              mostrarse.
            </p>
          ) : null}

          {/* Error de validación o del backend (`role="alert"` para lectores
              de pantalla) y confirmación de guardado (`role="status"`) */}
          {error !== null ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm font-medium text-emerald-600" role="status">
              Recordatorios guardados.
            </p>
          ) : null}

          <div>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={saving}
            >
              <Save className="size-4" aria-hidden />
              {saving ? "Guardando…" : "Guardar recordatorios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}