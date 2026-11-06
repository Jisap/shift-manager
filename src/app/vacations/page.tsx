import { Suspense } from "react";
import { VacationsView } from "@/features/vacations/VacationsView";

export default function VacationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Vacaciones
        </h1>
        <p className="text-muted-foreground text-sm">
          Define tu saldo anual, registra días sueltos y consulta cuántos te
          quedan.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Cargando…</p>}
      >
        <VacationsView />
      </Suspense>
    </main>
  );
}
