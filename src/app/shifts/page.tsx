import { Suspense } from "react";
import { ShiftTypesManager } from "@/features/shifts/ShiftTypesManager";

export default function ShiftsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">ShiftManager</p>
        <h1 className="text-2xl font-semibold tracking-tight">Tipos de turno</h1>
        <p className="text-sm text-muted-foreground">
          Crea los turnos que usas habitualmente para reutilizarlos en tus
          patrones.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <ShiftTypesManager />
      </Suspense>
    </main>
  );
}
