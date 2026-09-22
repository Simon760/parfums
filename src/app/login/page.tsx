import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="eyebrow mb-3">Olfactothèque personnelle</p>
      <h1 className="display mb-10 text-7xl">
        100<span className="italic text-accent">bon</span>
      </h1>
      <LoginForm initialError={typeof error === "string" ? error : null} />
    </main>
  );
}
