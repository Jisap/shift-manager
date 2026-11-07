import { Suspense } from "react";
import { ReminderSettingsView } from "@/features/reminders/ReminderSettingsView";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Ajustes
        </h1>
        <p className="text-muted-foreground text-sm">
          Configura los recordatorios del próximo turno y el permiso de
          notificaciones de este dispositivo.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Cargando…</p>}
      >
        <ReminderSettingsView />
      </Suspense>
    </main>
  );
}
