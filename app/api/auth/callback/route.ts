import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/auth/callback — Supabase OAuth + magic link exchange
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
