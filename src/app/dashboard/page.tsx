import { Suspense } from "react";
import { DashboardView } from "@/features/statistics/DashboardView";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-primary text-sm font-medium">ShiftManager</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Tus próximos turnos, el resumen de horas y la comparación entre lo
          previsto y lo trabajado.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Cargando…</p>}
      >
        <DashboardView />
      </Suspense>
    </main>
  );
}
