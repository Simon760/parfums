import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <div className="aura pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-70 blur-3xl" />
      <div className="aura pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full opacity-60 blur-3xl" />
      <div className="glass relative w-full max-w-sm rounded-4xl border border-white/70 p-7 shadow-lift">
        <span className="aura mb-6 block h-12 w-12 rounded-full shadow-soft" />
        <h1 className="title text-[52px]">100bon</h1>
        <p className="mb-8 mt-2 text-[15px] text-ink-2">Ta collection, et le parfum du jour.</p>
        <LoginForm initialError={typeof error === "string" ? error : null} />
      </div>
    </main>
  );
}
