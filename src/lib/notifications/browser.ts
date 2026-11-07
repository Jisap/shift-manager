/**
 * Utilidades del API de notificaciones del navegador.
 *
 * Se usa `registration.showNotification` del service worker cuando está
 * disponible (funciona también con la app instalada) y `new Notification`
 * como respaldo. Los ajustes y la programación viven en el cliente: no hay
 * servidor de push, así que los avisos solo se muestran con la app abierta.
 */

export type NotificationPermissionState =
  NotificationPermission | "unsupported";

// Evento interno para avisar a React de que el permiso puede haber cambiado
// (tras la petición explícita o al volver a la pestaña).
const PERMISSION_EVENT = "shiftmanager:notification-permission";

/**
 * Suscripción al estado del permiso para `useSyncExternalStore`. Se escuchan
 * los cambios de visibilidad/foco porque el usuario puede modificar el permiso
 * desde los ajustes del navegador.
 */
export function subscribeNotificationPermission(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("focus", callback);
  window.addEventListener("visibilitychange", callback);
  window.addEventListener(PERMISSION_EVENT, callback);
  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener("visibilitychange", callback);
    window.removeEventListener(PERMISSION_EVENT, callback);
  };
}

/** Snapshot del permiso en el cliente. */
export function notificationPermissionSnapshot(): NotificationPermissionState {
  return notificationPermission();
}

/** Snapshot para el renderizado en servidor (no hay API de notificaciones). */
export function notificationPermissionServerSnapshot(): NotificationPermissionState {
  return "unsupported";
}

/** Notifica a los suscriptores de que el permiso puede haber cambiado. */
export function notifyPermissionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERMISSION_EVENT));
  }
}

export interface BrowserNotificationInput {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Indica si el navegador expone el API de notificaciones. */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Estado actual del permiso, o "unsupported" si no existe el API. */
export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Pide permiso para mostrar notificaciones. Debe llamarse desde una acción
 * del usuario (un clic); si no, el navegador puede rechazarla.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) {
    return "unsupported";
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "default";
  }
}

/**
 * Muestra una notificación si hay permiso. Devuelve `true` si se pudo enviar.
 * El clic en la notificación lo gestiona el service worker (`notificationclick`)
 * o, en su defecto, la ventana que la creó.
 */
export async function showBrowserNotification(
  input: BrowserNotificationInput,
): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }

  const options: NotificationOptions = {
    body: input.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: input.tag,
    data: { url: input.url ?? "/" },
  };

  try {
    if (navigator.serviceWorker !== undefined) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration !== undefined) {
        await registration.showNotification(input.title, options);
        return true;
      }
    }
  } catch {
    // Si el service worker falla se intenta el camino directo.
  }

  try {
    new Notification(input.title, options);
    return true;
  } catch {
    return false;
  }
}
