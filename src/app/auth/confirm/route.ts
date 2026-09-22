import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, isAllowedEmail } from "@/lib/supabase/server";

/** Retour du lien magique (flux PKCE `code`, ou `token_hash` si template d'email personnalisé). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
  } else {
    error = "Lien invalide";
  }

  if (!error) {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email || !isAllowedEmail(data.user.email)) {
      await supabase.auth.signOut();
      error = "Cet email n'est pas autorisé.";
    }
  }

  const target = error ? `/login?error=${encodeURIComponent(error)}` : "/";
  return NextResponse.redirect(new URL(target, origin));
}
