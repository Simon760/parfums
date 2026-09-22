import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { requireUser } from "./supabase/server";
import { AIError } from "./ai/client";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Enveloppe de route API : vérifie l'utilisateur et convertit les erreurs en JSON. */
export async function handle(fn: (supabase: SupabaseClient) => Promise<unknown>) {
  try {
    const supabase = await requireUser();
    if (!supabase) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const result = await fn(supabase);
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return NextResponse.json({ error: `Donnée invalide : ${issue?.path.join(".")} — ${issue?.message}` }, { status: 400 });
    }
    if (error instanceof HttpError || error instanceof AIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
