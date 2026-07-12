# QuickScanZ — Unified Authentication Plan

Status: **DRAFT — founder review required before any implementation.**
Scope: research + design only. No auth code was changed by this PR. Two safe,
inert artifacts are included: this doc and a read-only duplicate-audit SQL
script (`scripts/audit-duplicate-identities.sql`).

Supabase project: `yqfwvnrnpydcrzomzdvr` (quickscanz)
Repo: `PranixQuick/quickscanz`
Author: research agent, 2026-07-12

---

## 0. TL;DR for the founder

- We already manually merged the scattered duplicate accounts once. The literal
  duplicates (same email or same phone on two different `auth.users` rows) are
  now **zero** — Supabase's own unique constraints prevent that case going
  forward. That part is not the risk anymore.
- The real, ongoing risk is **silent fragmentation**: right now **15 of 19
  users (79%) have only one sign-in method linked** to their account, with no
  field in common with any other identity. If that same person ever uses a
  *different* method (phone vs Google vs email) than the one they signed up
  with, Supabase has no way to know it's the same human — it will happily
  create a second, completely unrelated `auth.users` row. That is exactly how
  the mess we just cleaned up got created.
- Good news: QuickScanZ already has 90% of the mechanism needed to fix this.
  `components/auth/PhoneBindingOverlay.tsx` already performs a correct
  Supabase **manual link** (`updateUser({ phone }) → verifyOtp({ type:
  "phone_change" })`) while a user is signed in — we can see it already
  worked once in production (user `vastav11@gmail.com` now has both `google`
  and `phone` identities on one account). It's just gated behind an
  environment flag (`NEXT_PUBLIC_FORCE_PHONE_BINDING`, currently unset/off)
  and only covers phone→existing-account, not the reverse (Google/email→
  phone-only account).
- Top 3 things the founder needs to do (details in §5):
  1. In Supabase Dashboard → Authentication → Sign In / Providers, turn on
     **"Allow manual linking"** (`GOTRUE_SECURITY_MANUAL_LINKING_ENABLED`).
     Without this, `supabase.auth.linkIdentity()` will fail for every user.
  2. Decide the **canonical identifier**: recommendation is phone (E.164,
     verified) as the anchor, because the codebase already treats phone OTP
     as "primary — works for illiterate users" (see `app/login/page.tsx`
     comment) and India-first consumer apps converge on phone as the anchor.
     Email/Google become linkable secondary methods.
  3. Approve turning on `NEXT_PUBLIC_FORCE_PHONE_BINDING` (or its planned
     replacement, a non-blocking "secure your account" nudge — see §3.3) as a
     **rollout-gated** change, not a silent flip — this changes a live user
     flow and must go through staging first.

---

## 1. How Supabase's account-linking model actually works

Verified against current Supabase docs (`supabase.com/docs/guides/auth/auth-identity-linking`)
on 2026-07-12, cross-checked against the observed data in this project (see §6).

### 1.1 Automatic linking

- Applies **only to OAuth providers** (Google, GitHub, etc.), and only when
  the *email address* on the incoming OAuth identity matches the email of an
  **existing, verified** identity already on file.
- When it fires, Supabase attaches the new OAuth identity to the existing
  `auth.users` row (no new user row is created) and — as a side effect —
  removes any other *unconfirmed* identities on that account (anti
  pre-account-takeover measure).
- This is **on by default** and requires no dashboard setting. It is already
  working in this project: three real users
  (`prashanthrangineni@gmail.com`, `monsieur.gautam@gmail.com`,
  `kuberahospitality@gmail.com`) each have one `auth.users` row with **both**
  `email` and `google` identities attached — proof automatic linking is live
  and functioning correctly today.

### 1.2 Manual linking (`linkIdentity()`) — beta, off by default

- Lets an **already-signed-in** user explicitly attach another identity
  (OAuth or, via `updateUser()`, an email/phone) to their current account,
  regardless of whether the emails match.
- Must be turned on per-project: Dashboard → Authentication → Providers →
  "Allow manual linking" (self-hosted: `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED=true`).
- Client calls: `supabase.auth.linkIdentity({ provider: 'google' })` for
  OAuth, or `supabase.auth.updateUser({ phone })` / `updateUser({ email })`
  followed by `verifyOtp({ type: 'phone_change' | 'email_change' })` for
  phone/email — **this exact `updateUser` + `verifyOtp(type: "phone_change")`
  pattern is already implemented** in
  `components/auth/PhoneBindingOverlay.tsx` and has succeeded at least once
  in production (see §6.3).
- Unlinking requires the user to have ≥2 linked identities
  (`getUserIdentities()` + `unlinkIdentity()`).
- **SSO/SAML identities are explicitly excluded** from both linking
  strategies — not relevant to QuickScanZ today (no SAML), but worth knowing
  if enterprise SSO is ever added.

### 1.3 Phone is a hard boundary — the fact that matters most here

- Phone number is **never** a target of automatic linking. Supabase's
  automatic-linking logic only compares *email addresses* across OAuth
  identities. A user who signs in with phone OTP and a user who signs in with
  Google using the same real-world person's email are, to Supabase, two
  unrelated humans unless a manual link is performed.
- Phone-to-phone is self-consistent: `auth.users.phone` is unique, so
  `signInWithOtp({ phone })` for a number that already exists just signs the
  person into their existing account — it cannot itself create a duplicate.
- The **only** gap is cross-method: phone-first user later tries Google (or
  vice versa) with no prior link. That gap cannot be closed automatically by
  Supabase — it requires app-level UX (§3) and, for the past, a data backfill
  (§4).

### 1.4 supabase-js client version check

`package.json` currently pins `"@supabase/supabase-js": "^2.44.4"`.
`linkIdentity()` / `getUserIdentities()` / `unlinkIdentity()` shipped in
supabase-js **2.45.0** (mid-2024). The `^` range means `npm install` already
resolves to a version that has these methods, but **verify the resolved
version in `package-lock.json` before writing any linking code** — pin
explicitly to `>=2.45.0` in `package.json` rather than relying on the range,
so a clean install can't silently regress.

---

## 2. How major consumer apps unify identity (reference model)

This is the pattern QuickScanZ should converge on — it is well-established
and not unique to any one vendor:

1. **One canonical, verified anchor identifier.** Amazon and Swiggy in India
   anchor on **phone number** (OTP-verified); Google anchors on **email**.
   The anchor is chosen for the market/context — QuickScanZ's own code
   comments already indicate phone was chosen for the same reason Swiggy/
   Amazon India use it ("works for illiterate users").
2. **Every other sign-in method is a linked credential on the same account,
   not a new account.** Google/Apple/email/password are all attached to the
   one canonical user record.
3. **Collision detection happens at the moment of signup, not after the
   fact.** When someone tries to register with a phone/email that's already
   on file, the flow branches to "An account already exists — sign in
   instead" (or, if they're already signed in under a different method,
   "link this to your existing account") rather than silently creating a
   second account.
4. **Users are proactively nudged to add a second verified method** (usually
   right after first login, and again from account settings) so that by the
   time they might use a different login path, the account is already
   resilient to that ambiguity.
5. **Merges of pre-existing duplicates are a deliberate, auditable, one-time
   operation** — never automatic and never silent — driven by matching
   verified fields (confirmed phone or confirmed email), with data
   reassignment via foreign keys and human review, not overwritten data.

QuickScanZ's target design (§3) is this pattern adapted to the existing
Next.js/Supabase stack, reusing the linking primitive that's already proven
to work in this codebase.

---

## 3. Target design for QuickScanZ

### 3.1 Canonical identity strategy

- **Keep `auth.users.id` (UUID) as the one and only canonical account ID.**
  Do not introduce a separate "person" table/ID — Supabase's identity model
  already supports N identities → 1 user row; use it as designed.
- **Phone (E.164, verified) is the recommended primary anchor**, consistent
  with existing code comments ("Phone OTP Flow (primary — works for
  illiterate users)" in `app/login/page.tsx`) and the India-first user base.
  Google and email/password become **secondary, linkable** methods.
- `public.profiles` stays the app-facing mirror of `auth.users` (already has
  `email` + `phone` columns, kept in sync via the `handle_new_user` trigger
  and `PhoneBindingOverlay`'s upsert). No schema change needed for this
  design; profiles is a good place to add a `linked_providers` computed view
  later if the account UI needs to show "Signed in with: Google, Phone" (see
  §5a, optional).

### 3.2 How a new sign-in method attaches to an existing user

| Scenario | Mechanism | Status today |
|---|---|---|
| Existing email/password (or magic-link) user signs in with Google using the **same verified email** | Supabase **automatic linking** | Already works (3 real users prove it) — no code change needed |
| Signed-in user wants to add a phone number to their Google/email account | `supabase.auth.updateUser({ phone })` → `verifyOtp({ type: "phone_change" })` | **Already implemented** in `PhoneBindingOverlay.tsx`, gated off by default |
| Signed-in user wants to add Google to a phone-only account | `supabase.auth.linkIdentity({ provider: "google" })` | **Not implemented.** Needs: (1) "Allow manual linking" enabled in dashboard, (2) a small UI addition — see §5 |
| Signed-in user wants to add email/password to an OAuth-only account | `supabase.auth.updateUser({ password })` (after adding email if none) | Not implemented; low priority, email/password is already being phased toward "passwordless" per `app/forgot-password/page.tsx` comment |
| Brand-new person, no session, tries phone OTP with a number that already exists | Supabase enforces phone uniqueness — signs into the **existing** account automatically | Already safe by construction |
| Brand-new person, no session, tries Google with an email that matches an existing **phone-only** account (no email on file) | **No match possible** — Supabase has nothing to compare against phone. A brand-new second account is created. | **This is the real gap.** Mitigated by UX in §3.3, not by Supabase config |

### 3.3 UX when a collision is detected or suspected

Two distinct situations, two different flows:

**A. Detectable collision (email matches, but user is starting a *phone* OTP flow while a Google/email account with that identity already exists under a different session).**
Today the login page doesn't ask for email during phone signup, so this case
mostly does not arise for phone. It **does** arise for Google: if a user
signs up with Google, Supabase auto-links by email — this is silent and
correct, requiring no prompt. No new UX needed here.

**B. Undetectable collision (the real gap): a person already has an account
under method A (say, phone) and is now authenticating fresh via method B
(say, Google) with no shared field.**
This cannot be detected by Supabase or by any SQL query, because there is no
common key. The only mitigations are:

1. **Proactive linking nudge, not reactive detection.** Immediately after
   first successful login/onboarding (and again, dismissibly, from
   `/account`), show a lightweight prompt: *"Add [Google / your phone
   number] to make sign-in faster and keep your account safe."* Wire it to
   `linkIdentity()` (Google) or the existing `updateUser`+`verifyOtp` pattern
   (phone). This is the direct extension of what `PhoneBindingOverlay`
   already does, generalized to run for every user (not just the
   `NEXT_PUBLIC_FORCE_PHONE_BINDING` wallet-gated case) and to support the
   Google direction too.
2. **Self-service "I already have an account" affordance** on the login
   screen: a visible link/button next to the phone-OTP form and the Google
   button that says "Signed in a different way before? Use that method, then
   link this one from Account settings." This doesn't stop the duplicate
   from being *possible*, but it steers returning users back to their
   original account instead of guessing.
3. **Accept residual risk, monitor it.** Even Amazon/Swiggy cannot fully
   prevent this case (a user who signs up fresh with a different phone/email
   combo than before looks, cryptographically, like a new person). What
   those apps do differently is (1) heavily bias new users toward completing
   their profile with all contact methods early, and (2) run periodic
   backend reconciliation (fuzzy match on name/device/payment instrument) —
   out of scope for QuickScanZ's current stage, but §4's audit script is the
   repeatable, low-effort version of that reconciliation.

### 3.4 What does NOT need to change

- `app/auth/callback/route.ts` (OAuth code exchange) — no change needed;
  automatic linking is handled entirely by Supabase Auth server-side before
  the callback even fires.
- `middleware.ts` — session/redirect logic is orthogonal to identity linking.
- `lib/supabase/client.ts` / `server.ts` — standard `@supabase/ssr` clients,
  no change needed; `linkIdentity()` and `updateUser()` are called from
  these same clients.
- The unique constraints Supabase already enforces on `auth.users.email` and
  `auth.users.phone` — these are the reason zero literal duplicates exist
  today (§6). Do not weaken them.

---

## 4. Handling existing (and future) duplicates

### 4.1 What we found (§6): no literal duplicates remain

The manual merge already done means there are currently **zero** rows in
`auth.users` sharing the same email or the same normalized phone, and zero
duplicate `profiles.email` / `profiles.phone`. So there is **no pending
backfill action required today**.

### 4.2 The repeatable script (for next time)

Because future duplicates from the gap in §3.3(B) are only detectable when
they happen to share *some* field (email, phone, or a manually-confirmed
"same human" from support), we're committing a repeatable, **read-only**
audit script: `scripts/audit-duplicate-identities.sql`. It:

- Counts identities by provider and by "how many providers does this user
  have" (the leading indicator of fragmentation risk — see §6.2).
- Finds any `auth.users` rows sharing a normalized email or phone (should
  always be empty given Supabase's constraints, but cheap to verify after
  any bulk import / admin script / future auth migration).
- Finds any `public.profiles` rows sharing an email or phone (this table is
  app-managed, not constrained by Supabase, so it CAN drift — this is the
  one place a real duplicate could reappear silently, e.g. via a buggy
  `upsert`).
- Surfaces users with `provider_count = 1` and account age > 30 days — the
  actionable "nudge these people to link a second method" list for a
  lifecycle email/notification campaign.

Run it monthly (or wire into a scheduled job / dashboard) — it's read-only
and safe to run anytime, including in prod, via the Supabase SQL editor or
`execute_sql`.

### 4.3 If a real duplicate is found in the future (manual merge runbook)

For a confirmed pair of `auth.users` rows that are the same human (matched
by a founder-verified phone or email, i.e. **never automated**):

1. Pick the **surviving** user id (prefer the one with more linked
   identities, more data, or the one the person is currently using).
2. Reassign data: reuse the same `user_id`/`owner_id` column-discovery
   pattern already implemented in
   `supabase/migrations/20260623_add_delete_user_account_function.sql`
   (`delete_user_account`) — write a mirror-image `merge_user_account(source
   uuid, target uuid)` `SECURITY DEFINER` function that `UPDATE`s every
   `user_id`/`owner_id` column from `source` to `target` instead of
   deleting, wrapped in a transaction, with a `unique` conflict fallback
   (e.g. `family_members(group_id, user_id)`, `push_subscriptions.endpoint`)
   that skips/deletes the source-side row when the target already has one.
   **Do not write this function yet** — it's a natural follow-up PR once the
   founder confirms the runbook, but it is not needed today (§4.1) and
   touching the DB is out of scope for this docs-only PR.
3. Merge `public.profiles`: keep the row with `onboarded_at` set (or the
   more complete one); merge `phone`/`email`/`display_name` via `COALESCE`.
4. Use the Supabase Admin API (`admin.auth.admin.deleteUser`, same pattern
   already used in `app/api/account/delete/route.ts`) to remove the losing
   `auth.users` row **only after** step 2 succeeds and has been spot-checked.
5. Never do this interactively against prod without a transaction + a dry
   run against a Supabase branch/staging copy first (Supabase branching is
   available via `create_branch` — use it).

---

## 5. Deliverables

### (a) Code changes needed (future PRs — NOT in this PR)

1. `components/auth/AccountLinkingPanel.tsx` (new) — small component for
   `/account` that lists `getUserIdentities()` and offers "Add Google" /
   "Add phone number" buttons, calling `linkIdentity({ provider: "google"
   })` and the existing `updateUser`+`verifyOtp` phone pattern respectively.
   Reuses the OTP UI already built in `PhoneBindingOverlay.tsx` (extract its
   phone-OTP sub-form into a shared component rather than duplicating it).
2. `app/dashboard/page.tsx` — generalize the `needsPhoneBinding` gate (today
   env-flag-only, blocking) into a **dismissible, non-blocking** nudge banner
   shown to any user with `provider_count = 1`, pointing at the new
   `/account` linking panel, instead of a full-screen forced overlay. Keep
   the hard-block overlay path available behind its existing env flag for
   features that truly require a verified phone (e.g. the wallet feature it
   was built for).
3. `app/login/page.tsx` — add the small "Already have an account under a
   different method?" affordance described in §3.3(B).2. No changes to the
   existing Google/Phone OTP handlers themselves.
4. `lib/actions/auth.ts` — no functional change required; optionally add a
   comment documenting that `signIn`/`demoSignIn` (email+password) are
   legacy/demo-only, consistent with `app/forgot-password/page.tsx`'s note
   that the product is "now passwordless."
5. `package.json` — bump `@supabase/supabase-js` to an explicit
   `>=2.45.0` floor (currently `^2.44.4`, which resolves correctly today but
   should be pinned intentionally since `linkIdentity` is load-bearing).

None of the above are included in this PR — they are scoped for founder-
approved follow-up PRs once §5(b) settings are confirmed, per the "no blind
auth code changes" constraint for this task.

### (b) Supabase Auth dashboard settings the founder must flip

1. **Authentication → Sign In / Providers → "Allow manual linking"** — must
   be turned ON for `linkIdentity()` / the phone `updateUser` flow to work
   for accounts that don't already share an email. (Phone-linking already
   works today for the `PhoneBindingOverlay` case even without this, because
   `updateUser({ phone })` on a signed-in session doesn't require manual
   linking to be enabled the same way `linkIdentity()` for OAuth does —
   **verify this nuance in the dashboard before relying on it**, since
   GoTrue's exact gating of `updateUser`-based phone/email linking vs.
   `linkIdentity`-based OAuth linking should be confirmed against the live
   project settings, not assumed.)
2. **Authentication → Providers → Email → "Confirm email"** should remain
   ON (required for automatic linking's verified-email safety check to be
   meaningful — an unconfirmed email must never be treated as a match).
3. **Authentication → Password → "Leaked password protection"** — currently
   **disabled** per `get_advisors` (WARN: `auth_leaked_password_protection`).
   Turn it on; low risk, applies only to the legacy email+password path.
4. Confirm **SMS provider webhook** config (`SEND_SMS_HOOK_SECRET`, already
   wired in `app/api/auth/sms-webhook/route.ts`) is production-healthy before
   expanding phone-linking usage, since more linking flows = more OTP SMS
   volume.

### (c) Rollout order (to avoid locking anyone out)

1. Ship this docs PR (no runtime change).
2. Flip dashboard settings in §5(b) on a Supabase **branch** first (use
   `create_branch`), verify `linkIdentity()` works end-to-end for a test
   Google+phone account, then apply to prod.
3. Ship the read-only `/account` "linked methods" panel (§5a.1) with **no**
   forced/blocking behavior — pure opt-in. Low risk, reversible via feature
   flag.
4. Ship the non-blocking dashboard nudge banner (§5a.2), still opt-in/
   dismissible. Monitor `auth_leaked_password_protection`-style advisories
   and the `provider_count` distribution (via the audit script) week over
   week — the fragmentation number (currently 79%) should trend down as
   users self-link.
5. Only after (3)+(4) are stable and adopted, consider re-enabling
   `NEXT_PUBLIC_FORCE_PHONE_BINDING`-style **blocking** flows for any new
   feature that truly requires a verified phone — and even then, gate it
   behind a percentage rollout, not a global flip, since it can lock
   Google-only users out of a feature they were previously using.
6. Never combine steps 2–5 in one deploy. Each step is independently
   reversible; a combined deploy is not.

---

## 6. Quantifying the current state (SQL, run 2026-07-12 against `yqfwvnrnpydcrzomzdvr`)

### 6.1 Headline numbers

| Metric | Value |
|---|---|
| Total `auth.users` | **19** |
| Total `auth.identities` | 23 (google: 9, email: 8, phone: 6) |
| Users with exactly 1 linked provider | **15 (79%)** |
| Users with exactly 2 linked providers | 4 (21%) |
| Users with 3 linked providers | 0 |
| Duplicate emails across different `auth.users` rows | **0** |
| Duplicate normalized phones across different `auth.users` rows | **0** |
| Duplicate `profiles.email` rows | 0 |
| Duplicate `profiles.phone` rows | 0 |
| `profiles` rows total / with phone / with email / onboarded | 18 / 7 / 13 / 16 |

**Reading this:** the manual merge worked — there are no more literal
duplicates for Supabase or the app to trip over. But 15 of 19 accounts are
one sign-in-method-away from becoming a *new*, unrelated account the next
time that person authenticates differently — that's the number to watch
going forward, and it's exactly what `scripts/audit-duplicate-identities.sql`
tracks over time.

### 6.2 Provider linkage detail (excluding 4 obvious QA/test accounts:
`test1@quickscanz.com`, `test2@quickscanz.com`,
`qabot-quickscanz@pranix-qa.test`, `qa.onboard.20260614@example.com`)

- **3 real users already correctly auto-linked** (email + google, same
  verified email, one `auth.users` row each): `prashanthrangineni@gmail.com`,
  `monsieur.gautam@gmail.com`, `kuberahospitality@gmail.com`.
- **1 real user already correctly manually linked** (google + phone, via the
  existing `PhoneBindingOverlay` flow): `vastav11@gmail.com` /
  `+918008511122`.
- **5 real users, phone-only, no second method**: `+919494999494`,
  `+917671025654`, `+919515479595`, `+918500171122`, and `+919876543210`
  (this last number is a well-known placeholder/demo Indian number —
  possibly itself a test artifact; worth confirming with the founder before
  including it in any lifecycle nudge).
- **5 real users, google-only, no second method**: `pranixailabs@gmail.com`,
  `themodernsage1@gmail.com`, `naveengudelli33@gmail.com`,
  `pranavdesigners@gmail.com`, `greatwave.blr@gmail.com`.
- **1 real user, email-only (non-demo)**: `svinfrasolutionsmd@gmail.com`.

These 11 real single-method accounts are the concrete, named "at risk of
future fragmentation" list today — good candidates for the first linking
nudge campaign once §5(a).1–2 ship.

### 6.3 Supporting evidence for §1 and §3

The `vastav11@gmail.com` case (google + phone on one `auth.users` row) is
direct production proof that `PhoneBindingOverlay.tsx`'s
`updateUser({ phone }) → verifyOtp({ type: "phone_change" })` linking
pattern works correctly today — it just needs to be (a) generalized beyond
its current `NEXT_PUBLIC_FORCE_PHONE_BINDING`-gated single call site
(`app/dashboard/page.tsx`), and (b) mirrored for the Google-onto-phone-only
direction using `linkIdentity()`.

### 6.4 Other findings along the way (not auth-linking, noted for completeness)

- Supabase security advisor `auth_leaked_password_protection`: **WARN**,
  currently disabled — see §5(b).3.
- `public.delete_user_account(uuid)` (from
  `20260623_add_delete_user_account_function.sql`) already implements a
  generic "find every table with a `user_id`/`owner_id` column and act on
  it" pattern — this is the template reused for the proposed
  `merge_user_account` function in §4.3, so no new discovery/introspection
  logic needs to be invented.
