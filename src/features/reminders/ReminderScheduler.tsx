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
// `subscribeToToday` no se suscribe a nada (la fecha no emite eventos) y
// devuelve una función de limpieza vacía.
function subscribeToToday(): () => void {
  return () => { };
}

// Valor en el cliente: hoy en formato "yyyy-MM-dd".
function todaySnapshot(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// Valor en el servidor: `null`, para que el HTML prerenderizado no dependa
// de la fecha.
function todayServerSnapshot(): null {
  return null;
}

export function ReminderScheduler() {
  // Sin sesión no se lanza ninguna consulta ni se programa nada.
  const { isAuthenticated } = useConvexAuth();
  // Hoy ("yyyy-MM-dd"), o `null` durante el prerender del servidor.
  const today = useSyncExternalStore(
    subscribeToToday,
    todaySnapshot,
    todayServerSnapshot,
  );

  // Ajustes de recordatorios del usuario (activado, antelación, avisos de cambio).
  const settings = useQuery(
    api.reminders.getSettings,
    isAuthenticated ? {} : "skip",
  );
  // Calendario de los próximos días, para localizar el siguiente turno. Espera
  // a conocer `today` porque el rango parte de esa fecha.
  const upcoming = useQuery(
    api.calendar.getRange,
    isAuthenticated && today !== null
      ? {
        startDate: today,
        endDate: addLocalDays(today, UPCOMING_DAYS),
      }
      : "skip",
  );
  // Tipos de turno, para poner su nombre en el texto de la notificación.
  const shifts = useQuery(api.shiftTypes.list, isAuthenticated ? {} : "skip");

  // Firma del último turno visto en esta sesión, para detectar cambios.
  // Es un `ref` (no estado) porque modificarla no debe provocar un nuevo render.
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    // Hasta tener sesión, fecha, ajustes y calendario no hay nada que programar.
    if (
      !isAuthenticated ||
      today === null ||
      settings === undefined ||
      upcoming === undefined
    ) {
      return;
    }

    // Recordatorios desactivados: se olvida el turno conocido para que, al
    // reactivarlos, no se interprete como un cambio.
    if (!settings.enabled) {
      lastSignature.current = null;
      return;
    }

    // Sin permiso de notificaciones del navegador no se puede avisar.
    if (notificationPermission() !== "granted") {
      return;
    }

    // Nombres de turno por id para componer el mensaje.
    const shiftNames = new Map(
      (shifts ?? []).map((shift) => [String(shift._id), shift.name]),
    );
    // `buildShiftReminder` (lógica pura) calcula el próximo turno, la hora del
    // recordatorio (turno menos `leadMinutes`) y el texto a mostrar. Devuelve
    // `undefined` si no hay ningún turno que avisar.
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
    // La primera vez que se ve un turno solo se guarda su firma; si luego la
    // firma cambia (otro día, horario o turno), se notifica el cambio.
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

    // Programa el recordatorio con un temporizador. Si la hora ya pasó no se
    // avisa (no se recupera retroactivamente), y si superase el máximo de
    // `setTimeout` se descarta para evitar que se dispare al instante.
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

    // Limpieza: cada vez que cambian los datos o los ajustes se cancela el
    // temporizador anterior y se recalcula uno nuevo.
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, settings, upcoming, shifts, today]);

  // No renderiza nada; el componente existe solo por su efecto.
  return null;
}