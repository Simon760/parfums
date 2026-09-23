"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm`, shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setLoading(false);
    if (error) setError("Code invalide ou expiré.");
    else router.replace("/");
  }

  const input =
    "mt-1.5 w-full rounded-2xl bg-white/80 px-4 py-3.5 text-[16px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/10";
  const button =
    "mt-5 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-30";

  return step === "email" ? (
    <form onSubmit={sendLink}>
      <label className="label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="toi@exemple.com"
        className={input}
      />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button disabled={loading} className={button}>
        {loading ? "Envoi…" : "Recevoir le lien de connexion"}
      </button>
    </form>
  ) : (
    <form onSubmit={verifyCode}>
      <p className="mb-6 text-sm leading-relaxed text-ink-2">
        Un email est parti vers <strong className="font-medium text-ink">{email}</strong>. Clique sur le lien, ou saisis
        le code reçu ici (pratique depuis l&apos;app installée sur l&apos;écran d&apos;accueil).
      </p>
      <label className="label" htmlFor="code">
        Code
      </label>
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className={`${input} tracking-[0.4em]`}
      />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button disabled={loading || code.trim().length < 6} className={button}>
        {loading ? "Vérification…" : "Se connecter"}
      </button>
      <button type="button" onClick={() => setStep("email")} className="mt-4 w-full text-sm text-muted">
        Changer d&apos;email
      </button>
    </form>
  );
}
