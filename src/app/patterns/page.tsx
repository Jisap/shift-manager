import { Suspense } from "react";
import { PatternsManager } from "@/features/patterns/PatternsManager";

export default function PatternsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Patrones</h1>
        <p className="text-sm text-muted-foreground">
          Crea ciclos semanales o rotativos y asigna un turno a cada día.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Cargando…</p>}
      >
        <PatternsManager />
      </Suspense>
    </main>
  );
}
