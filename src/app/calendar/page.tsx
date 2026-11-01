import { Suspense } from "react";
import { CalendarView } from "@/features/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-primary text-sm font-medium">ShiftManager</p>
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground text-sm">
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
