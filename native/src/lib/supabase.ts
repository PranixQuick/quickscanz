import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal: lets the app boot (and show a real error) instead of a bundler crash.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy native/.env.example to native/.env and fill in the same project values " +
      "the web app uses (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
  );
}

/**
 * Shared Supabase client for the native app.
 * - Same Supabase project as the web app (no new backend).
 * - Session persisted in AsyncStorage (not SecureStore) so supabase-js can
 *   freely read/write it on every auth state change; the *sensitive* copy used
 *   for biometric-gated restore lives in SecureStore (see src/lib/biometric.ts).
 * - flowType "pkce" is required for signInWithOAuth to work in a native app
 *   (no shared browser cookie jar like on web).
 */
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
