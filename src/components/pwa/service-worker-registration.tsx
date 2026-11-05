"use client";

/**
 * ServiceWorkerRegistration
 * ----------------------------------------------------------------------------
 * Registra el service worker (`/sw.js`) de la aplicación para habilitar las
 * funciones de PWA (caché y uso sin conexión). No pinta nada: solo ejecuta el
 * registro en el navegador al montarse.
 */

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // En desarrollo no se registra: un service worker cacheando recursos
    // dificulta ver los cambios al recargar.
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Navegadores sin soporte de service workers: no se hace nada.
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // `scope: "/"` hace que controle toda la aplicación (requiere que `sw.js`
    // se sirva desde la raíz). `updateViaCache: "none"` obliga al navegador a
    // pedir `sw.js` a la red al buscar actualizaciones, sin usar la caché HTTP,
    // para que las nuevas versiones se detecten sin demora. Los errores de
    // registro se ignoran: la app funciona igual sin service worker.
    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.warn("No se pudo registrar el Service Worker:", error);
        });
    };

    // El registro espera a que la página termine de cargar para no competir
    // con los recursos iniciales. Si ya cargó, se registra al momento; si no,
    // se espera al evento `load` (una sola vez).
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    // Limpieza: si el componente se desmonta antes de que cargue la página,
    // se quita el listener para no registrar fuera de lugar.
    return () => window.removeEventListener("load", register);
  }, []);

  // No renderiza nada; el componente existe solo por su efecto.
  return null;
}