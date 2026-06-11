-- Migration: warranty_expiry_cron
-- Runs daily via pg_cron and calls the /api/push endpoint for each user
-- whose product warranty expires in exactly 30 days OR 7 days OR 1 day.
-- pg_cron must be enabled: Supabase Dashboard → Database → Extensions → pg_cron

-- 1. Enable pg_cron extension (idempotent)
create extension if not exists pg_cron;

-- 2. Create a log table so we can debug missed notifications
create table if not exists warranty_notification_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  product_id   uuid not null,
  days_left    int  not null,
  notified_at  timestamptz not null default now(),
  status       text not null default 'sent' -- 'sent' | 'failed' | 'skipped'
);
create index if not exists idx_wn_log_user on warranty_notification_log (user_id);
create index if not exists idx_wn_log_product on warranty_notification_log (product_id, days_left);

-- 3. Function called by cron: finds expiring products and POSTs to /api/push
create or replace function notify_expiring_warranties() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  _payload jsonb;
  _response_status int;
begin
  for r in
    select
      p.id          as product_id,
      p.user_id,
      p.name        as product_name,
      p.brand,
      p.expiry_date,
      extract(day from (p.expiry_date::timestamptz - now())) :: int as days_left
    from products p
    where
      p.is_demo = false
      and p.expiry_date is not null
      and extract(day from (p.expiry_date::timestamptz - now())) :: int in (30, 7, 1)
      -- Avoid duplicate notifications for same product+days_left within 25 hours
      and not exists (
        select 1 from warranty_notification_log wl
        where wl.product_id = p.id
          and wl.days_left   = extract(day from (p.expiry_date::timestamptz - now())) :: int
          and wl.notified_at > now() - interval '25 hours'
      )
  loop
    _payload := jsonb_build_object(
      'user_id',      r.user_id,
      'product_id',   r.product_id,
      'product_name', r.product_name,
      'brand',        r.brand,
      'days_left',    r.days_left
    );

    -- Call the Next.js push API route via pg_net (Supabase's HTTP extension)
    -- pg_net is enabled by default on all Supabase projects
    perform net.http_post(
      url     := current_setting('app.push_api_url', true) || '/api/push',
      headers := jsonb_build_object(
        'Content-Type',       'application/json',
        'x-cron-secret',      current_setting('app.cron_secret', true)
      ),
      body    := _payload::text
    );

    -- Log the attempt
    insert into warranty_notification_log (user_id, product_id, days_left, status)
    values (r.user_id, r.product_id, r.days_left, 'sent');
  end loop;
end;
$$;

-- 4. Schedule: run daily at 9am IST (3:30 UTC)
select cron.schedule(
  'warranty-expiry-daily',       -- job name (idempotent)
  '30 3 * * *',                  -- 9:00 AM IST = 03:30 UTC
  $$select notify_expiring_warranties()$$
);

-- 5. Set the push API URL and cron secret as Postgres settings
-- These must match your Vercel env vars. Run once manually:
--   alter database postgres set app.push_api_url = 'https://quickscanz.com';
--   alter database postgres set app.cron_secret  = '<your-cron-secret>';
-- Or set via Supabase Dashboard > SQL Editor.
