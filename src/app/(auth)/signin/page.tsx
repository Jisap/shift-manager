import { AuthForm } from "@/features/auth/AuthForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">ShiftManager</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Bienvenido de nuevo
        </h1>
      </div>
      <AuthForm />
    </main>
  );
}
