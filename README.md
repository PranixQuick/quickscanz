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
To install on iOS: visit in Safari → tap **Share → Add to Home Screen**

---

## 🔐 Auth Flow

| Route | Access |
|-------|--------|
| `/` | Public |
| `/about` | Public |
| `/how-it-works` | Public |
| `/privacy-policy` | Public |
| `/login` | Public (redirects to /dashboard if logged in) |
| `/dashboard` | Protected (redirects to /login if not logged in) |
| `/products` | Protected |
| `/products/add` | Protected |
| `/products/[id]` | Protected |

Auth is handled in `middleware.ts` using `@supabase/ssr`.

---

## 🎨 Design System Reference

**Fonts:**
- Display: `Cormorant Garamond` (headings, product names, numbers)
- Body: `DM Sans` (UI text, labels, buttons)
- Mono: `DM Mono` (step numbers, codes)

**Core colors:**
```
cream-50:  #fdfcf8  ← page background
cream-100: #faf7f0  ← card backgrounds
sand-400:  #d4b08c  ← borders, accents
sand-500:  #c49572  ← links, highlights
sage-500:  #4e894e  ← active warranty
amber-600: #d97706  ← expiring soon
blush-500: #d95f54  ← expired
ink-900:   #1a1612  ← primary text, buttons
```

**Component tokens:**
- `.card` → glass card with border + shadow
- `.btn-primary` → dark fill button
- `.btn-secondary` → cream fill button
- `.btn-ghost` → transparent hover button
- `.input-field` → form input with cream bg
- `.label` → uppercase tiny label
- `.status-badge` → colored pill with dot

---

## 👉 Optional Enhancements (Non-breaking)

These improve UX without changing scope:

1. **Demo/sample products on first login** — Pre-populate a Samsung TV and an Apple MacBook for new users so the dashboard never feels empty. Delete them at any time.

2. **Warranty expiry progress bar on product card** — A thin colored line at the bottom of each card showing `daysRemaining / totalDays` visually.

3. **Share warranty info** — A "Share details" button on product detail that copies a plain-text warranty summary to clipboard (no external API needed).

4. **Sort & filter on products page** — Client-side toggle between "Expiring Soon first" and "Recently Added" — no server changes needed.

5. **Haptic feedback on mobile PWA** — `navigator.vibrate(10)` on button tap for native-like feel (2 lines of JS).

---

## 🔮 Architecture Notes for Future Phases

The codebase is structured to grow cleanly:

- **`lib/types.ts`** already defines `ProductIntelligence`, `PriceHistory`, `FailureReport`, `Recommendation`, and `InvoiceCapture` types — ready for Phase 2/3
- **`supabase/migrations/001_initial_schema.sql`** includes all Phase 2/3 table definitions, commented out and ready to activate
- **Server actions** in `lib/actions/` are isolated and can be extended per-domain without touching UI
- **`AppLayout`** is composable — Phase 2 can add a sidebar or tab without touching page components
- The `invoice_captures` table stub supports future WhatsApp/email/SMS/bank ingestion pipelines

---

## 🧪 Test Credentials

```
test1@quickscanz.com  /  123456
test2@quickscanz.com  /  123456
```

---

## 📋 Git Instructions

```bash
# Initial setup
git init
git add .
git commit -m "feat: QuickScanZ Phase 1 MVP — Warranty Wallet + Proof Locker"

# Add remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/PranixQuick.git
git branch -M main
git push -u origin main

# Future updates
git add .
git commit -m "fix: <description>"
git push
# Vercel auto-deploys on push to main
```

---

*QuickScanZ Phase 1 · Built for clarity when it matters most.*
