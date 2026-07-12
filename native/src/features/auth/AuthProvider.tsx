import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { OneSignal } from "react-native-onesignal";
import { supabase } from "../../lib/supabase";
import { registerPush, setPushExternalId, clearPushExternalId } from "../../lib/push";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const registeredUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Register for push + tag the OneSignal subscription with the Supabase
  // user id once per signed-in user — fire-and-forget, never blocks the
  // auth flow. OneSignal.login(user.id) sets the "external_id" that
  // supabase/functions/send-push-notifications/index.ts already targets
  // via `include_external_user_ids`, so no backend change is needed for
  // this device to start receiving pushes. See src/lib/push.ts.
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId || registeredUserRef.current === userId) return;
    registeredUserRef.current = userId;

    registerPush()
      .then(() => {
        setPushExternalId(userId);
        OneSignal.login(userId);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  async function signOut() {
    registeredUserRef.current = null;
    clearPushExternalId();
    try {
      OneSignal.logout();
    } catch {
      // defensive: OneSignal may not be initialized (e.g. missing App ID)
    }
    await supabase.auth.signOut();
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
