import { AuthForm } from "@/features/auth/AuthForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 px-6 py-12">
      <AuthForm />
    </main>
  );
}
