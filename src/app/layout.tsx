/**
 * Layout raíz de la aplicación (App Router de Next.js).
 *
 * Envuelve todas las páginas: define el HTML base, las fuentes, los metadatos
 * (incluidos los de PWA/iOS), los proveedores globales y el registro del
 * service worker.
 */

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/layout/AppHeader";
import "./globals.css";

// Fuentes de Google cargadas con `next/font` (se autoalojan en la compilación,
// sin peticiones a Google en tiempo de ejecución). Cada una expone una variable
// CSS que luego se aplica en la etiqueta <html>.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadatos por defecto de toda la app. `appleWebApp` y `icons.apple` permiten
// que, al añadirla a la pantalla de inicio en iOS, se abra como una app
// independiente con su nombre y su icono.
export const metadata: Metadata = {
  title: "ShiftManager",
  description:
    "Gestiona tus turnos, patrones y horas trabajadas de forma sencilla.",
  applicationName: "ShiftManager",
  appleWebApp: {
    capable: true,
    title: "ShiftManager",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

// Ajustes del viewport: `themeColor` tiñe la barra del navegador en móvil y
// `colorScheme: "light"` indica que la interfaz se diseña en modo claro.
export const viewport: Viewport = {
  themeColor: "#4f46e5",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `lang="es"` para lectores de pantalla y corrección ortográfica. Las
    // variables de fuente se aplican aquí para estar disponibles en toda la app.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* El body ocupa al menos toda la altura y es una columna flexible, de
          modo que el contenido de las páginas pueda estirarse a pantalla
          completa. */}
      <body className="min-h-full flex flex-col">
        {/* Proveedores globales (p. ej. Convex y autenticación). El registro
            del service worker va dentro, no pinta nada y se ejecuta una vez
            por carga de página. */}
        <Providers>
          <ServiceWorkerRegistration />
          <AppHeader />
          <div className="flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
