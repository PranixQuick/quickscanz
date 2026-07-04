-- ============================================================
-- Lock down public.user_subscriptions RLS
-- ============================================================
-- Bootstrap migration (20260612_bootstrap_quickscanz_schema.sql) created:
--   create policy "subs_own" on public.user_subscriptions
--     for all using (auth.uid() = user_id);
--
-- "for all" covers SELECT + INSERT + UPDATE + DELETE, all gated only by
-- row ownership. Any authenticated user's client (using the anon/publishable
-- key) could therefore INSERT or UPDATE their own row directly, e.g. set
-- plan_id = 'pro_yearly', status = 'active' -- fully bypassing Razorpay
-- payment verification.
--
-- Fix: replace with a SELECT-only owner policy. No INSERT/UPDATE/DELETE
-- policy is created for the authenticated/anon roles, so those operations
-- are denied by default under RLS. Backend payment-confirmation writes use
-- the service role (SUPABASE_SERVICE_ROLE_KEY), which bypasses RLS
-- entirely, so this does not affect:
--   - lib/actions/subscriptions.ts (createRazorpayOrder / createRazorpayRedirectUrl)
--   - app/api/payment/callback/route.ts
--   - app/api/payment/verify/route.ts (uses the user's session but only
--     ever writes status='active' after verifying the Razorpay HMAC
--     signature server-side -- if this route is intended to keep writing
--     via the user's own session going forward, it must be switched to the
--     service role in a follow-up, since this migration will now block it too)

drop policy if exists "subs_own" on public.user_subscriptions;

drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
create policy "user_subscriptions_select_own" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- Explicitly no insert/update/delete policy for authenticated/anon roles.
-- RLS default-denies any operation without a matching permissive policy,
-- so INSERT/UPDATE/DELETE from the anon/authenticated client are blocked.
-- The service role bypasses RLS and is unaffected.

-- Widen the status CHECK constraint to allow 'trial' (checkout flow writes
-- status='trial' via the service role when a Razorpay order is created,
-- before the payment is confirmed).
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('active', 'cancelled', 'expired', 'trial'));
