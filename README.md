# QuickScanZ — Setup & Deployment Guide

> Your Warranty Wallet · Post-Purchase Intelligence Platform · Phase 1

---

## 🗂 Project Structure

```
quickscanz/
├── app/
│   ├── layout.tsx                   # Root layout, fonts, metadata, Toaster
│   ├── globals.css                  # Design tokens, Tailwind base
│   ├── page.tsx                     # Public landing page (/)
│   ├── not-found.tsx                # 404 page
│   ├── login/
│   │   └── page.tsx                 # Beta login page
│   ├── dashboard/
│   │   ├── page.tsx                 # Auth: stats + product list
│   │   └── loading.tsx              # Skeleton loader
│   ├── products/
│   │   ├── page.tsx                 # All products, grouped by status
│   │   ├── loading.tsx
│   │   ├── add/
│   │   │   └── page.tsx             # Add product form
│   │   └── [id]/
│   │       ├── page.tsx             # Product detail (server)
│   │       └── loading.tsx
│   ├── about/page.tsx
│   ├── how-it-works/page.tsx
│   └── privacy-policy/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx            # Header + BottomNav wrapper
│   │   ├── AppHeader.tsx            # Top nav bar
│   │   └── BottomNav.tsx            # Mobile bottom navigation
│   ├── ui/
│   │   ├── StatusBadge.tsx          # Active / Expiring / Expired badge
│   │   ├── CountdownRing.tsx        # SVG warranty countdown ring
│   │   ├── EmptyState.tsx           # Empty list state with CTA
│   │   └── Skeleton.tsx             # Loading skeletons
│   └── products/
│       ├── ProductCard.tsx          # Card in list view
│       ├── StatsGrid.tsx            # Dashboard stat cards
│       ├── AddProductForm.tsx       # Client-side form with dropzone
│       └── ProductDetailClient.tsx  # Product detail with delete + invoice
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   └── server.ts                # Server Supabase client (SSR)
│   ├── actions/
│   │   ├── auth.ts                  # signIn, signOut server actions
│   │   └── products.ts              # CRUD server actions
│   ├── types.ts                     # All TypeScript types (Phase 1–3)
│   └── utils.ts                     # Date, currency, status helpers
│
├── middleware.ts                    # Auth route protection
├── supabase/migrations/
│   └── 001_initial_schema.sql       # Full DB schema + RLS + storage
├── public/
│   ├── manifest.json                # PWA manifest
│   └── icons/                       # App icons (you must add these)
├── next.config.js                   # Next.js + PWA config
├── tailwind.config.ts               # Design system / tokens
└── vercel.json                      # Vercel deploy config
```

---

## ⚡ Quick Start (Local Dev)

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/PranixQuick.git
cd PranixQuick
npm install
```

### Step 2 — Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yqfwvnrnpydcrzomzdvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your anon key from:
**Supabase Dashboard → Project Settings → API → Project API keys → anon public**

### Step 3 — Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗄 Supabase Setup

### Step 1 — Run SQL Schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/yqfwvnrnpydcrzomzdvr)
2. Go to **SQL Editor → New Query**
3. Paste the full contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

This creates:
- `products` table with RLS
- `invoices` storage bucket with per-user policies
- Commented stubs for Phase 2 tables (ready to uncomment)

### Step 2 — Create Beta Users

1. Go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Add both:
   - `test1@quickscanz.com` / `123456`
   - `test2@quickscanz.com` / `123456`

> ⚠️ Make sure **Email confirmations are disabled** for beta:
> Authentication → Providers → Email → Disable "Confirm email"

### Step 3 — Verify Storage

1. Go to **Storage**
2. Confirm `invoices` bucket exists and is set to **Public**
3. Check that the RLS policies are applied

---

## 🚀 Vercel Deployment

### Step 1 — Push to GitHub

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/PranixQuick.git
git add .
git commit -m "feat: QuickScanZ Phase 1 MVP"
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Log into [vercel.com](https://vercel.com) (account: pranixailabs-4456)
2. Click **Add New Project**
3. Import the `PranixQuick` GitHub repo
4. Framework: **Next.js** (auto-detected)

### Step 3 — Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yqfwvnrnpydcrzomzdvr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_anon_key_from_supabase` |
| `NEXT_PUBLIC_APP_URL` | `https://quickscanz.vercel.app` |

### Step 4 — Deploy

Click **Deploy**. Vercel will build and deploy automatically.

Every `git push` to `main` triggers a new deploy.

### Optional — Custom Domain

In Vercel → Project → **Domains**, add `quickscanz.com` or any domain.
Update `NEXT_PUBLIC_APP_URL` to match.

---

## 📱 PWA Setup (Icons Required)

You must add these icon files to `public/icons/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192 | Android home screen |
| `icon-512.png` | 512×512 | Splash screen |
| `apple-touch-icon.png` | 180×180 | iOS home screen |

**Quick way:** Use [realfavicongenerator.net](https://realfavicongenerator.net) or design a simple `QZ` monogram icon on [Canva](https://canva.com) and export at the required sizes.

The `manifest.json` is already configured and PWA is enabled in `next.config.js`.

To install on Android: visit the deployed URL in Chrome → tap **⋮ → Add to Home Screen**
To install on iOS: visit in Safari 

[…truncated 3411 chars — use a targeted search or request a specific line range]
