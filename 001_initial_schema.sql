-- ============================================================
-- QuickScanZ — Supabase Schema
-- Project: yqfwvnrnpydcrzomzdvr
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── ENABLE UUID EXTENSION ──────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PRODUCTS TABLE (Phase 1) ────────────────────────────────
create table if not exists public.products (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  brand           text not null,
  purchase_date   date not null,
  warranty_months integer not null check (warranty_months > 0),
  expiry_date     date not null,
  price           numeric(10, 2) default null,
  invoice_url     text default null,
  created_at      timestamptz default now() not null
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.products enable row level security;

-- Users can only read their own products
create policy "Users can view own products"
  on public.products for select
  using (auth.uid() = user_id);

-- Users can insert their own products
create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

-- Users can update their own products
create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = user_id);

-- Users can delete their own products
create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- ─── INDEXES ─────────────────────────────────────────────────
create index idx_products_user_id on public.products(user_id);
create index idx_products_expiry_date on public.products(expiry_date);
create index idx_products_created_at on public.products(created_at desc);

-- ─── STORAGE BUCKET FOR INVOICES ─────────────────────────────
-- Run this in Dashboard → Storage → Create bucket, OR via SQL:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Storage RLS: Users can only manage their own folder
create policy "Users can upload own invoices"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own invoices"
  on storage.objects for select
  using (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own invoices"
  on storage.objects for delete
  using (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read for invoice URLs (so images render in UI)
create policy "Public can view invoice files"
  on storage.objects for select
  using (bucket_id = 'invoices');


-- ─── BETA USERS (Run this AFTER enabling Email auth in Supabase) ──
-- Go to: Authentication → Users → Add User (manually)
-- test1@quickscanz.com / 123456
-- test2@quickscanz.com / 123456


-- ─── FUTURE PHASE 2 SCAFFOLDING (do not use in Phase 1 UI) ──
-- Uncomment when Phase 2 begins

-- create table if not exists public.product_intelligence (
--   id                  uuid default uuid_generate_v4() primary key,
--   product_id          uuid references public.products(id) on delete cascade,
--   avg_lifespan_months integer,
--   failure_rate_pct    numeric(5,2),
--   common_issues       text[],
--   last_updated        timestamptz default now()
-- );

-- create table if not exists public.price_history (
--   id          uuid default uuid_generate_v4() primary key,
--   product_id  uuid references public.products(id) on delete cascade,
--   price       numeric(10,2) not null,
--   recorded_at timestamptz default now(),
--   source      text
-- );

-- create table if not exists public.failure_reports (
--   id          uuid default uuid_generate_v4() primary key,
--   product_id  uuid references public.products(id) on delete cascade,
--   user_id     uuid references auth.users(id) on delete cascade,
--   description text not null,
--   reported_at timestamptz default now(),
--   resolved    boolean default false
-- );

-- create table if not exists public.recommendations (
--   id         uuid default uuid_generate_v4() primary key,
--   user_id    uuid references auth.users(id) on delete cascade,
--   product_id uuid references public.products(id),
--   reason     text,
--   score      numeric(3,2),
--   created_at timestamptz default now()
-- );

-- ─── FUTURE CAPTURE SYSTEM SCAFFOLDING ───────────────────────
-- create table if not exists public.invoice_captures (
--   id                uuid default uuid_generate_v4() primary key,
--   user_id           uuid references auth.users(id) on delete cascade,
--   source            text check (source in ('whatsapp','email','sms','bank','manual')),
--   raw_content       text,
--   parsed_product_id uuid references public.products(id),
--   status            text check (status in ('pending','parsed','failed')) default 'pending',
--   captured_at       timestamptz default now()
-- );
