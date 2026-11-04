import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-primary text-sm font-medium">ShiftManager</p>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Tus turnos, claros y bajo control
      </h1>

      <p className="text-muted-foreground max-w-xl text-lg">
        Organiza turnos rotativos, consulta tu calendario y compara las horas
        previstas con las trabajadas. El proyecto está en fase de preparación.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signin">Entrar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shifts">Gestionar turnos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/patterns">Patrones</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/calendar">Calendario</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Turnos, patrones, calendario y estadísticas ya disponibles. Siguiente:
        exportación en PDF y CSV.
      </p>
    </main>
  );
}
