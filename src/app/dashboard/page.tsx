import { Suspense } from "react";
import { DashboardView } from "@/features/statistics/DashboardView";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
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
