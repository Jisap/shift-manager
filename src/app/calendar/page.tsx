import { Suspense } from "react";
import { CalendarView } from "@/features/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Consulta los turnos resueltos por tu patrón, con descansos y cambios.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Cargando…</p>}
      >
        <CalendarView />
      </Suspense>
    </main>
  );
}
