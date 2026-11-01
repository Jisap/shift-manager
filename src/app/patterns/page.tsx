import { Suspense } from "react";
import { PatternsManager } from "@/features/patterns/PatternsManager";

export default function PatternsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-primary text-sm font-medium">ShiftManager</p>
        <h1 className="text-2xl font-semibold tracking-tight">Patrones</h1>
        <p className="text-muted-foreground text-sm">
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
