-- ============================================================================
-- QuickScanZ — Repeatable duplicate-identity / fragmentation audit
-- ============================================================================
-- Read-only. Safe to run anytime against production via the Supabase SQL
-- editor, `execute_sql`, or a scheduled job. Does not modify any data.
--
-- Companion to docs/UNIFIED_AUTH_PLAN.md — see that doc for the full context
-- on why this matters (Supabase never auto-links phone to email/Google, so
-- accounts with only one linked provider are the leading indicator of future
-- duplicate-account risk, not literal duplicates already in the DB).
--
-- Run all five queries together for a full picture, or any one in isolation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Headline counts: total users, total identities, identities by provider
-- ----------------------------------------------------------------------------
select
  (select count(*) from auth.users) as total_users,
  (select count(*) from auth.identities) as total_identities,
  (select count(*) from auth.identities where provider = 'google') as google_identities,
  (select count(*) from auth.identities where provider = 'email')  as email_identities,
  (select count(*) from auth.identities where provider = 'phone')  as phone_identities;

-- ----------------------------------------------------------------------------
-- 2. Fragmentation indicator: how many users have only ONE linked provider
--    (this is the number to watch over time — it should trend DOWN as the
--    account-linking UX from docs/UNIFIED_AUTH_PLAN.md §5(a) ships and users
--    self-link a second method)
-- ----------------------------------------------------------------------------
select
  provider_count,
  count(*) as num_users,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct_of_users
from (
  select user_id, count(distinct provider) as provider_count
  from auth.identities
  group by user_id
) t
group by provider_count
order by provider_count;

-- ----------------------------------------------------------------------------
-- 3. Literal duplicates in auth.users (should always be empty — Supabase
--    enforces unique email/phone on auth.users. A non-empty result here
--    means something bypassed Supabase Auth directly, e.g. a raw INSERT via
--    the service role or a broken migration, and needs immediate investigation.)
-- ----------------------------------------------------------------------------
select 'duplicate_email' as issue, lower(email) as key, array_agg(id) as user_ids
from auth.users
where email is not null and email <> ''
group by lower(email)
having count(distinct id) > 1
union all
select 'duplicate_phone' as issue, regexp_replace(phone, '[^0-9]', '', 'g') as key, array_agg(id) as user_ids
from auth.users
where phone is not null and phone <> ''
group by regexp_replace(phone, '[^0-9]', '', 'g')
having count(distinct id) > 1;

-- ----------------------------------------------------------------------------
-- 4. Literal duplicates in public.profiles (this table is app-managed, NOT
--    constrained by Supabase Auth, so it CAN silently drift out of sync --
--    e.g. via a buggy upsert. A non-empty result here is a real bug to fix,
--    independent of anything Supabase-side.)
-- ----------------------------------------------------------------------------
select 'duplicate_profile_email' as issue, lower(email) as key, array_agg(id) as profile_ids
from public.profiles
where email is not null and email <> ''
group by lower(email)
having count(*) > 1
union all
select 'duplicate_profile_phone' as issue, phone as key, array_agg(id) as profile_ids
from public.profiles
where phone is not null and phone <> ''
group by phone
having count(*) > 1;

-- ----------------------------------------------------------------------------
-- 5. Actionable list: real (non-QA/test) users with exactly one linked
--    provider, ordered by account age. This is the lifecycle-nudge target
--    list -- prompt these users (oldest first) to add a second sign-in
--    method from /account once the linking UI ships.
--    NOTE: adjust the "exclude test/QA accounts" filter below to match your
--    actual test-account naming convention before using this for outreach.
-- ----------------------------------------------------------------------------
select
  u.id,
  u.email,
  u.phone,
  u.created_at,
  now() - u.created_at as account_age,
  array_agg(distinct i.provider) as linked_providers
from auth.users u
join auth.identities i on i.user_id = u.id
where u.id in (
  select user_id from auth.identities group by user_id having count(distinct provider) = 1
)
and coalesce(u.email, '') not ilike '%@quickscanz.com'
and coalesce(u.email, '') not ilike '%@pranix-qa.test'
and coalesce(u.email, '') not ilike '%@example.com'
group by u.id, u.email, u.phone, u.created_at
order by u.created_at asc;
