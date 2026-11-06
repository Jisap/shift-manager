import { Suspense } from "react";
import { ShiftTypesManager } from "@/features/shifts/ShiftTypesManager";

export default function ShiftsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tipos de turno</h1>
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
