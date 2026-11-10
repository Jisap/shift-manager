import {
  Bell,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Layers,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Umbrella,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroCta } from "@/components/layout/HeroCta";

/* ─── Datos estáticos ─────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: "Calendario dinámico",
    description:
      "Vistas mensual, semanal, diaria y agenda. Los patrones se proyectan solos: solo editas las excepciones.",
    icon: CalendarDays,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    href: "/calendar",
  },
  {
    title: "Turnos personalizados",
    description:
      "Define turnos de mañana, tarde, noche o partidos con tramos, pausas y color identificativo.",
    icon: Clock,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    href: "/shifts",
  },
  {
    title: "Ciclos rotativos",
    description:
      "Diseña patrones semanales o secuencias complejas que se proyectan automáticamente en el tiempo.",
    icon: Layers,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    href: "/patterns",
  },
  {
    title: "Métricas y horas",
    description:
      "Compara al instante horas previstas vs. reales trabajadas, horas extra y festivos trabajados.",
    icon: LayoutDashboard,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    href: "/dashboard",
  },
  {
    title: "Gestión de vacaciones",
    description:
      "Registra y consulta tus días de vacaciones. El saldo se refleja en el calendario y el dashboard.",
    icon: Umbrella,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    href: "/vacations",
  },
  {
    title: "Recordatorios de turno",
    description:
      "Recibe avisos del navegador antes de que empiece tu próximo turno, incluso en móvil.",
    icon: Bell,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    href: "/settings",
  },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Sincronización en tiempo real", color: "text-emerald-500" },
  { icon: Download, label: "Instalable como app (PWA)", color: "text-sky-500" },
  { icon: FileText, label: "Exporta a CSV o PDF", color: "text-violet-500" },
];

/* ─── Mockup estático del calendario ─────────────────────────────────────── */

const MOCK_DAYS: { shift: string | null; color: string | null }[] = [
  { shift: "M", color: "#7c3aed" },
  { shift: "M", color: "#7c3aed" },
  { shift: "T", color: "#0ea5e9" },
  { shift: "T", color: "#0ea5e9" },
  { shift: "N", color: "#f59e0b" },
  { shift: null, color: null },
  { shift: null, color: null },
];

function CalendarMockup() {
  return (
    <div
      aria-hidden
      className="border-border/60 bg-card w-full overflow-hidden rounded-2xl border shadow-2xl"
    >
      {/* Barra de título del mockup */}
      <div className="bg-muted/50 border-border/40 flex items-center gap-2 border-b px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400/70" />
        <span className="size-3 rounded-full bg-amber-400/70" />
        <span className="size-3 rounded-full bg-emerald-400/70" />
        <span className="text-muted-foreground ml-3 text-xs">shiftmanager · Noviembre 2026</span>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 border-b border-border/40 px-3 pt-3">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="text-muted-foreground pb-2 text-center text-[11px] font-semibold uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Semana de muestra */}
      <div className="grid grid-cols-7 gap-1 p-3">
        {MOCK_DAYS.map(({ shift, color }, i) => (
          <div
            key={i}
            className="flex min-h-16 flex-col rounded-xl border border-border/40 p-1.5"
            style={color ? { borderColor: color, backgroundColor: `${color}18` } : undefined}
          >
            <span
              className="mb-1 self-end rounded-full px-1.5 text-[11px] font-bold"
              style={
                i === 2
                  ? { backgroundColor: "#7c3aed", color: "#fff" } // "hoy" simulado
                  : { color: "#888" }
              }
            >
              {10 + i}
            </span>
            {shift ? (
              <>
                <span
                  className="rounded px-1 text-[10px] font-semibold"
                  style={{ color, backgroundColor: `${color}25` }}
                >
                  {shift === "M" ? "Mañana" : shift === "T" ? "Tarde" : "Noche"}
                </span>
                <span className="mt-0.5 text-[9px]" style={{ color: color ?? "#888" }}>
                  {shift === "M" ? "07:00–15:00" : shift === "T" ? "15:00–23:00" : "23:00–07:00"}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Moon className="size-2.5 text-sky-400/60" />
                Libre
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Pie con resumen de horas */}
      <div className="border-t border-border/40 flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#7c3aed" }} />
            Mañana · 16 h
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#0ea5e9" }} />
            Tarde · 16 h
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
            Noche · 8 h
          </span>
        </div>
        <span className="text-[11px] font-semibold text-foreground">40 h / sem.</span>
      </div>
    </div>
  );
}

/* ─── Página ──────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden border-b border-border/40 bg-radial-[at_60%_0%] from-primary/8 via-background to-background py-16 sm:py-24">
        {/* Decoración de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 size-[600px] rounded-full bg-primary/5 blur-3xl"
        />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          {/* Texto */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              <span>Gestión inteligente de turnos de trabajo</span>
            </div>

            <h1 className="max-w-xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Tus turnos,{" "}
              <span className="text-primary">claros</span>{" "}
              y bajo control
            </h1>

            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              Organiza turnos rotativos, consulta tu calendario en tiempo real,
              registra horas reales y compara con lo planificado — todo en un solo lugar.
            </p>

            {/* CTA dinámico (client) */}
            <HeroCta />

            {/* Badges de confianza */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground lg:justify-start">
              {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className={`size-4 ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup del calendario */}
          <div className="hidden lg:block">
            <CalendarMockup />
          </div>
        </div>
      </section>

      {/* ── Vista previa en móvil (debajo del hero) ──────────────────────── */}
      <section className="w-full border-b border-border/40 bg-muted/30 px-4 py-10 sm:px-6 lg:hidden">
        <p className="mb-4 text-center text-sm font-semibold text-foreground">
          Vista previa del calendario
        </p>
        <div className="mx-auto max-w-md">
          <CalendarMockup />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-12 flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Todo lo que necesitas en tu día a día
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            ShiftManager reúne las herramientas esenciales para que nunca pierdas
            la pista de tu jornada laboral.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, description, icon: Icon, color, bg, href }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              {/* Icono */}
              <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${bg} transition-transform duration-200 group-hover:scale-110`}>
                <Icon className={`size-5 ${color}`} />
              </div>

              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>

              <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Acceder
                <span className="transition-transform duration-150 group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="w-full border-t border-border/40 bg-primary/5 py-16 sm:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2 text-primary">
            <Sun className="size-5" />
            <Moon className="size-4 opacity-60" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Empieza hoy, sin complicaciones
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Crea tu cuenta en segundos y configura tu primer turno en menos de un minuto.
            Sin suscripciones, sin límites.
          </p>
          <Button asChild size="lg" className="mt-2 h-11 gap-2 px-8 shadow-sm">
            <Link href="/signin">
              <Sparkles className="size-4" />
              Empezar gratis
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
