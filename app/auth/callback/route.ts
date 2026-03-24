import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery — redirect to reset page
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", requestUrl.origin));
      }
      // Email verification — redirect to dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", requestUrl.origin));
}
