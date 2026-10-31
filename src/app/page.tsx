export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium text-primary">ShiftManager</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Tus turnos, claros y bajo control
      </h1>
      <p className="max-w-xl text-lg text-secondary">
        Organiza turnos rotativos, consulta tu calendario y compara las horas
        previstas con las trabajadas. El proyecto está en fase de preparación.
      </p>
      <p className="text-sm text-secondary">
        Fase 1: entorno configurado. Siguiente: autenticación y calendario.
      </p>
    </main>
  );
}
