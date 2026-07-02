"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEMO_LOGIN_ALLOWLIST } from "@/lib/demo-allowlist";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }

  redirect("/dashboard");
}

/**
 * Reviewer/demo sign-in — used by the "Sign in with email" link on the login
 * page. Every email is checked against DEMO_LOGIN_ALLOWLIST *before* Supabase
 * is ever called; anything not on the list gets the same generic error a
 * failed password would, so this never becomes a general password-login
 * feature and never weakens auth for real users.
 */
export async function demoSignIn(formData: FormData): Promise<{ error?: string }> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";

  if (!email || !password || !DEMO_LOGIN_ALLOWLIST.includes(email)) {
    // Generic message — never reveal whether an email is allow-listed.
    return { error: "Invalid credentials. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Failed to retrieve session. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  redirect(profile?.onboarded_at ? "/dashboard" : "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
