import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// In-app account deletion — Google Play "Account & data deletion" + DPDP Act.
// Deletes ALL of the signed-in user's data, then the auth user itself. Irreversible.
// Runs server-side only; clients can never call the privileged delete function directly.
export async function POST() {
  // 1) Authenticate via the user's own (server-validated) session.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) Purge all of the user's rows (every user-owned table + profile) via the
  //    SECURITY DEFINER function. Service role only — anon/authenticated revoked.
  const { error: dataError } = await admin.rpc("delete_user_account", { target: user.id });
  if (dataError) {
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }

  // 3) Remove the auth user itself.
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  // 4) Best-effort clear of the local session (the user no longer exists).
  try { await supabase.auth.signOut(); } catch { /* session already invalid */ }

  return NextResponse.json({ ok: true });
}
