"use client";

/**
 * ReminderScheduler
 * ----------------------------------------------------------------------------
 * Programa en el cliente el recordatorio del próximo turno y, si se activa,
 * avisa cuando ese turno cambia mientras la app está abierta.
 *
 * No pinta nada. Las notificaciones usan el API del navegador y el service
 * worker; no hay servidor de push, por lo que los avisos no se entregan con la
 * aplicación cerrada (ver `shiftManager.md` §5.22).
 */

import { useConvexAuth, useQuery } from "convex/react";
import { format } from "date-fns";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { api } from "../../../convex/_generated/api";
import { addLocalDays } from "@/lib/dates/local-date";
import {
  notificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser";
import { buildShiftReminder } from "@/lib/reminders/schedule";

// Ventana de días que se consulta para localizar el próximo turno. Se mantiene
// corta para no pedir un calendario largo en todas las páginas.
const UPCOMING_DAYS = 14;
// Límite de `setTimeout` en navegadores (~24,8 días).
const MAX_TIMEOUT_MS = 2_147_483_647;

// El día actual no se lee durante el renderizado del servidor: Next.js lo
// trataría como un valor inestable en el prerender. Con `useSyncExternalStore`
// el servidor usa `null` y el cliente obtiene la fecha al hidratar.
function subscribeToToday(): () => void {
  return () => {};
}

function todaySnapshot(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function todayServerSnapshot(): null {
  return null;
}

export function ReminderScheduler() {
  const { isAuthenticated } = useConvexAuth();
  const today = useSyncExternalStore(
    subscribeToToday,
    todaySnapshot,
    todayServerSnapshot,
  );

  const settings = useQuery(
    api.reminders.getSettings,
    isAuthenticated ? {} : "skip",
  );
  const upcoming = useQuery(
    api.calendar.getRange,
    isAuthenticated && today !== null
      ? {
          startDate: today,
          endDate: addLocalDays(today, UPCOMING_DAYS),
        }
      : "skip",
  );
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");

  // Firma del último turno visto en esta sesión, para detectar cambios.
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isAuthenticated ||
      today === null ||
      settings === undefined ||
      upcoming === undefined
    ) {
      return;
    }

    if (!settings.enabled) {
      lastSignature.current = null;
      return;
    }

    if (notificationPermission() !== "granted") {
      return;
    }

    const shiftNames = new Map(
      (shifts ?? []).map((shift) => [String(shift._id), shift.name]),
    );
    const plan = buildShiftReminder({
      days: upcoming.days,
      timezone: upcoming.timezone,
      leadMinutes: settings.leadMinutes,
      now: Date.now(),
      today,
      shiftNames,
    });

    if (plan === undefined) {
      lastSignature.current = null;
      return;
    }

    // Aviso de cambio: solo si ya había un turno conocido en esta sesión.
    const previous = lastSignature.current;
    lastSignature.current = plan.signature;
    if (
      previous !== null &&
      previous !== plan.signature &&
      settings.notifyChanges
    ) {
      void showBrowserNotification({
        title: "Cambio de turno",
        body: plan.body,
        tag: `shift-change-${plan.shiftDate}`,
        url: plan.url,
      });
    }

    const delay = plan.reminderAt - Date.now();
    if (delay <= 0 || delay > MAX_TIMEOUT_MS) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void showBrowserNotification({
        title: plan.title,
        body: plan.body,
        tag: plan.tag,
        url: plan.url,
      });
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, settings, upcoming, shifts, today]);

  return null;
}
