"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import PhoneLinkModal from "./PhoneLinkModal";

interface Props {
  userId: string;
}

interface DisplayIdentity {
  id: string;
  provider: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  phone: "Phone",
  email: "Email & password",
};

function labelFor(provider: string) {
  return PROVIDER_LABEL[provider] ?? provider;
}

/**
 * "Linked sign-in methods" panel for /account.
 *
 * Purely additive and opt-in: it only ever *adds* a sign-in method to the
 * current, already-authenticated session. It never removes, merges, or
 * deletes anything, and it never blocks access to the rest of the account
 * page — every action here is optional and dismissible.
 *
 * Requires the founder to enable "Allow manual linking" in
 * Supabase Dashboard -> Authentication -> Providers for the Google-link and
 * email-link actions to succeed (see docs/UNIFIED_AUTH_PLAN.md §5(b)).
 * Until that is enabled, Supabase returns a clear error which is surfaced
 * to the user instead of leaving the button appearing broken.
 */
export default function LinkedMethods({ userId }: Props) {
  const [identities, setIdentities] = useState<DisplayIdentity[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [googlePending, startGoogleTransition] = useTransition();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [emailPending, startEmailTransition] = useTransition();

  const loadIdentities = useCallback(async () => {
    setLoadError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      setLoadError("Couldn't load your linked sign-in methods right now. Try refreshing this page.");
      return;
    }
    setIdentities(
      (data?.identities ?? []).map((i) => ({ id: i.identity_id, provider: i.provider }))
    );
  }, []);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  const hasProvider = (provider: string) =>
    identities?.some((i) => i.provider === provider) ?? false;

  function handleLinkGoogle() {
    setActionError("");
    setActionNotice("");
    startGoogleTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          // Reuse the existing OAuth callback route — it already supports a
          // `next` param and requires no changes for this to work.
          redirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      });

      if (error) {
        if (error.status === 422 || /already (registered|linked|exists|associated)/i.test(error.message)) {
          setActionError(
            "This Google account is already linked to a QuickScanZ account (possibly a different one). Sign in with Google directly instead."
          );
        } else if (/manual linking/i.test(error.message)) {
          setActionError(
            "Account linking isn't turned on for QuickScanZ yet. Please try again later."
          );
        } else {
          setActionError(error.message);
        }
      }
      // On success, Supabase redirects to Google then back to /auth/callback,
      // which lands back on /account — identities refresh on that reload.
    });
  }

  function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setActionNotice("");
    if (!emailValue || passwordValue.length < 6) {
      setActionError("Enter a valid email and a password with at least 6 characters.");
      return;
    }
    startEmailTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        email: emailValue,
        password: passwordValue,
      });

      if (error) {
        if (error.status === 422 || /already (registered|linked|exists|associated)/i.test(error.message)) {
          setActionError(
            "That email is already registered to a QuickScanZ account. Sign in with that email instead, or use a different one here."
          );
        } else {
          setActionError(error.message);
        }
        return;
      }

      setActionNotice(
        `We've sent a confirmation link to ${emailValue}. Click it to finish adding email sign-in — nothing changes until you confirm.`
      );
      setShowEmailForm(false);
      setEmailValue("");
      setPasswordValue("");
    });
  }

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">
        Linked sign-in methods
      </p>
      <p className="text-[11px] text-ink-300 mb-3">
        Optional — add another way to sign in. Nothing here changes how you sign in today.
      </p>

      {loadError && (
        <div className="px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl mb-3">
          <p className="text-xs text-blush-600 text-center leading-relaxed">{loadError}</p>
        </div>
      )}

      {identities === null && !loadError && (
        <p className="text-xs text-ink-300">Loading…</p>
      )}

      {identities !== null && (
        <div className="space-y-2">
          {identities.length === 0 ? (
            <p className="text-xs text-ink-300">No linked sign-in methods found.</p>
          ) : (
            identities.map((identity) => (
              <div
                key={identity.id}
                className="flex items-center justify-between px-3 py-2.5 bg-cream-100 rounded-xl"
              >
                <span className="text-sm text-ink-700">{labelFor(identity.provider)}</span>
                <span className="text-[10px] text-sage-600 font-semibold uppercase tracking-wide">
                  Linked
                </span>
              </div>
            ))
          )}

          <div className="pt-2 space-y-2">
            {!hasProvider("google") && (
              <button
                type="button"
                onClick={handleLinkGoogle}
                disabled={googlePending}
                className="w-full flex items-center justify-center gap-2 bg-white border border-cream-300 hover:bg-cream-100 active:scale-[0.98] text-ink-700 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {googlePending ? "Connecting…" : "Link Google"}
              </button>
            )}

            {!hasProvider("phone") && (
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-cream-300 hover:bg-cream-100 active:scale-[0.98] text-ink-700 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                Link phone number
              </button>
            )}

            {!hasProvider("email") && !showEmailForm && (
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(true);
                  setActionError("");
                  setActionNotice("");
                }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-cream-300 hover:bg-cream-100 active:scale-[0.98] text-ink-700 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                Add email &amp; password
              </button>
            )}

            {showEmailForm && (
              <form onSubmit={handleAddEmail} className="space-y-2 p-3 bg-cream-100 rounded-xl">
                <input
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-white border border-cream-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-sand-400"
                  required
                />
                <input
                  type="password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full px-3 py-2.5 bg-white border border-cream-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-sand-400"
                  minLength={6}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={emailPending}
                    className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-40 rounded-lg transition-all"
                  >
                    {emailPending ? "Adding…" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmailValue("");
                      setPasswordValue("");
                    }}
                    className="px-4 text-sm text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {hasProvider("google") && hasProvider("phone") && hasProvider("email") && (
              <p className="text-[11px] text-ink-300">
                You&apos;re all set — Google, phone, and email &amp; password are all linked.
              </p>
            )}
          </div>
        </div>
      )}

      {actionNotice && (
        <div className="mt-3 px-3 py-2.5 bg-sage-50 border border-sage-200 rounded-xl">
          <p className="text-xs text-sage-700 text-center leading-relaxed">{actionNotice}</p>
        </div>
      )}

      {actionError && (
        <div className="mt-3 px-3 py-2.5 bg-blush-50 border border-blush-200 rounded-xl">
          <p className="text-xs text-blush-600 text-center leading-relaxed">{actionError}</p>
        </div>
      )}

      {showPhoneModal && (
        <PhoneLinkModal
          userId={userId}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => {
            setShowPhoneModal(false);
            setActionNotice("Phone number linked to your account.");
            loadIdentities();
          }}
        />
      )}
    </div>
  );
}
