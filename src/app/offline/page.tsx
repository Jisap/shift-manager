import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sin conexión — ShiftManager",
  description: "No hay conexión a internet.",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-primary text-sm font-medium">ShiftManager</p>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Sin conexión
      </h1>

      <p className="text-muted-foreground">
        No podemos cargar tus datos porque no hay conexión a internet. La
        aplicación volverá a funcionar en cuanto recuperes la red. No se permite
        editar sin conexión.
      </p>

      <div>
        <Button asChild>
          <Link href="/">Reintentar</Link>
        </Button>
      </div>
    </main>
  );
}
