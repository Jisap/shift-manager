import {
  CalendarDays,
  Clock,
  Download,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Calendario dinámico",
    description: "Visualización mensual, semanal, diaria y agenda con resolución automática de patrones.",
    icon: CalendarDays,
    href: "/calendar",
  },
  {
    title: "Tipos de turno personalizados",
    description: "Configura turnos de mañana, tarde, noche o partidos con tramos y descansos exactos.",
    icon: Clock,
    href: "/shifts",
  },
  {
    title: "Patrones y ciclos rotativos",
    description: "Diseña patrones semanales o secuencias rotativas complejas que se proyectan solas en el tiempo.",
    icon: Layers,
    href: "/patterns",
  },
  {
    title: "Métricas y resumen de horas",
    description: "Compara al instante las horas previstas frente a las reales trabajadas y horas extra.",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden border-b border-border/40 bg-radial-[at_50%_0%] from-primary/10 via-background to-background py-16 sm:py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gestión inteligente de turnos de trabajo</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Tus turnos, claros <br className="hidden sm:inline" />
            y bajo control
          </h1>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Organiza turnos rotativos, consulta tu calendario en tiempo real, registra fichajes reales
            y compara las horas previstas con las trabajadas de manera precisa y sin esfuerzo.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 shadow-sm">
              <Link href="/calendar">Ver mi calendario</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6">
              <Link href="/dashboard">Ir al Dashboard</Link>
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Sincronización en tiempo real
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Download className="h-4 w-4 text-sky-500" />
              Soporte PWA e instalación móvil
            </span>
          </div>
        </div>
      </section>

      {/* Grid de Accesos rápidos y Características */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Todo lo que necesitas en tu día a día
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acceso directo a las herramientas principales de ShiftManager.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ title, description, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-2xs transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
            >
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-primary">
                <span>Acceder</span>
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
