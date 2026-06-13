-- ============================================================
-- QuickScanZ Bootstrap Migration v2
-- Safe to paste & run in Supabase SQL Editor
-- No superuser needed. No pg_cron needed.
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text,
  avatar_url       text,
  onboarded_at     timestamptz,
  preferred_locale text default 'en',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email
    where public.profiles.email is null;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update
  set email = excluded.email
  where public.profiles.email is null;


-- 2. APP_CONFIG
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
insert into public.app_config (key, value) values
  ('push_api_url', 'https://quickscanz.com'),
  ('cron_secret',  'REPLACE_WITH_YOUR_CRON_SECRET')
on conflict (key) do nothing;
alter table public.app_config enable row level security;
drop policy if exists "app_config_no_public" on public.app_config;
create policy "app_config_no_public" on public.app_config
  for all using (false);


-- 3. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subs_own" on public.push_subscriptions;
create policy "push_subs_own" on public.push_subscriptions
  for all using (auth.uid() = user_id);


-- 4. WARRANTY NOTIFICATION LOG
create table if not exists public.warranty_notification_log (
  id          bigint generated always as identity primary key,
  product_id  uuid not null,
  user_id     uuid not null,
  days_before int  not null,
  sent_at     timestamptz default now(),
  unique (product_id, days_before)
);
alter table public.warranty_notification_log enable row level security;
drop policy if exists "notif_log_service" on public.warranty_notification_log;
create policy "notif_log_service" on public.warranty_notification_log
  for all using (false);


-- 5. FAMILY TABLES
create table if not exists public.family_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users(id) on delete cascade,
  invite_code text unique default substring(md5(random()::text), 1, 8),
  created_at  timestamptz default now()
);
alter table public.family_groups enable row level security;
drop policy if exists "family_groups_member_select" on public.family_groups;
create policy "family_groups_member_select" on public.family_groups
  for select using (
    id in (select group_id from public.family_members where user_id = auth.uid())
  );
drop policy if exists "family_groups_owner_all" on public.family_groups;
create policy "family_groups_owner_all" on public.family_groups
  for all using (owner_id = auth.uid());

create table if not exists public.family_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid references public.family_groups(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);
alter table public.family_members enable row level security;
drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select" on public.family_members
  for select using (
    group_id in (select group_id from public.family_members where user_id = auth.uid())
  );
drop policy if exists "family_members_insert" on public.family_members;
create policy "family_members_insert" on public.family_members
  for insert with check (
    group_id in (select id from public.family_groups where owner_id = auth.uid())
    or user_id = auth.uid()
  );
drop policy if exists "family_members_delete_own" on public.family_members;
create policy "family_members_delete_own" on public.family_members
  for delete using (user_id = auth.uid());


-- 6. SUBSCRIPTION PLANS
create table if not exists public.subscription_plans (
  id            text primary key,
  name          text not null,
  description   text,
  price_inr     int  not null default 0,
  interval      text not null default 'monthly'
                  check (interval in ('monthly','yearly','lifetime')),
  product_limit int  not null default 8,
  features      jsonb default '[]'::jsonb,
  is_active     boolean default true
);
insert into public.subscription_plans (id, name, description, price_inr, interval, product_limit, features) values
  ('free', 'Free', 'For individuals getting started', 0, 'monthly', 8,
   '["8 products","5 AI claims/month","Expiry reminders"]'::jsonb),
  ('pro_monthly', 'Pro', 'Unlimited tracking for your whole home', 149, 'monthly', 999999,
   '["Unlimited products","Unlimited AI claims","Family Vault","Invoice storage","WhatsApp share"]'::jsonb),
  ('pro_yearly', 'Pro Yearly', 'Best value', 999, 'yearly', 999999,
   '["Unlimited products","Unlimited AI claims","Family Vault","Invoice storage","Save 789/yr"]'::jsonb)
on conflict (id) do nothing;


-- 7. USER SUBSCRIPTIONS
create table if not exists public.user_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  plan_id    text references public.subscription_plans(id),
  status     text not null default 'active'
               check (status in ('active','cancelled','expired')),
  started_at timestamptz default now(),
  expires_at timestamptz
);
alter table public.user_subscriptions enable row level security;
drop policy if exists "subs_own" on public.user_subscriptions;
create policy "subs_own" on public.user_subscriptions
  for all using (auth.uid() = user_id);


-- 8. CRON FUNCTION (reads config from app_config — no superuser needed)
create or replace function public.notify_expiring_warranties()
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_api_url text;
  v_secret  text;
begin
  select value into v_api_url from public.app_config where key = 'push_api_url';
  select value into v_secret  from public.app_config where key = 'cron_secret';
  if v_api_url is null or v_secret = 'REPLACE_WITH_YOUR_CRON_SECRET' then
    raise notice 'notify_expiring_warranties: config not set, skipping';
    return;
  end if;
  perform net.http_post(
    url     := v_api_url || '/api/push/send',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',v_secret),
    body    := jsonb_build_object('days_before', d)
  ) from unnest(array[1, 7, 30]) as d;
end;
$$;


-- 9. FAMILY MEMBERS RPC
create or replace function public.get_family_members_with_email(p_group_id uuid)
returns table (
  id uuid, group_id uuid, user_id uuid, role text,
  joined_at timestamptz, display_name text, email text
)
language sql security definer stable set search_path = public, auth as
$$
  select
    fm.id, fm.group_id, fm.user_id, fm.role, fm.joined_at,
    coalesce(p.display_name, split_part(u.email,'@',1)) as display_name,
    u.email
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  left join public.profiles p on p.id = fm.user_id
  where fm.group_id = p_group_id
    and exists (
      select 1 from public.family_members caller
      where caller.group_id = p_group_id and caller.user_id = auth.uid()
    )
  order by fm.joined_at
$$;
grant execute on function public.get_family_members_with_email(uuid) to authenticated;

-- ============================================================
-- DONE. To schedule the cron (after enabling pg_cron extension):
-- select cron.schedule(
--   'warranty-expiry-notifications',
--   '30 3 * * *',
--   'select public.notify_expiring_warranties()'
-- );
-- ============================================================
