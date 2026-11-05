/**
 * Página de "Sin conexión".
 *
 * Es la pantalla de reserva que se muestra cuando no hay red y la ruta pedida
 * no está disponible en caché (el service worker la sirve en ese caso). Es un
 * componente de servidor sin estado: solo informa y ofrece reintentar.
 */

import { Button } from "@/components/ui/button";

// Título y descripción de la pestaña para esta página.
export const metadata = {
  title: "Sin conexión — ShiftManager",
  description: "No hay conexión a internet.",
};

export default function OfflinePage() {
  return (
    // Contenido centrado en vertical y limitado en ancho para que se lea bien
    // tanto en móvil como en escritorio.
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-primary text-sm font-medium">ShiftManager</p>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Sin conexión
      </h1>

      {/* Aviso de que la app necesita red; además aclara que no se puede
          editar sin conexión, para que nadie espere guardar cambios aquí. */}
      <p className="text-muted-foreground">
        No podemos cargar tus datos porque no hay conexión a internet. La
        aplicación volverá a funcionar en cuanto recuperes la red. No se permite
        editar sin conexión.
      </p>

      {/* "Reintentar" lleva a la página de inicio: si ya hay red, carga con
          normalidad; si no, se vuelve a mostrar esta pantalla. */}
      <div>
        <Button asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sin red hace falta una navegación completa que pase por el Service Worker */}
          <a href="/">Reintentar</a>
        </Button>
      </div>
    </main>
  );
}