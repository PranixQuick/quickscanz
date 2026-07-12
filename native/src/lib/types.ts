// Mirrors lib/types.ts on the web app — only the fields the native app
// actually reads/writes. Keep field names identical to the `products` table
// so objects can be passed straight to/from supabase-js without mapping.

export interface Product {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  purchase_date: string; // yyyy-mm-dd
  warranty_months: number;
  expiry_date: string; // yyyy-mm-dd — derived from purchase_date + warranty_months
  price: number | null;
  invoice_url: string | null;
  created_at: string;
  category?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  store_name?: string | null;
  notes?: string | null;
}

export type WarrantyStatus = "active" | "expiring_soon" | "expired";

/**
 * Shape returned by POST /api/ai/ocr (see app/api/ai/ocr/route.ts on the web
 * app — same interface name/fields as that route's internal `OCRResult`).
 * NOTE: the exact response envelope (bare object vs. `{ result: ... }`) was
 * not fully verifiable from this branch; native/app/(tabs)/scan.tsx unwraps
 * defensively. Confirm against the live route and simplify if it's bare.
 */
export interface OcrResult {
  brand: string | null;
  product_name: string | null;
  model_number: string | null;
  serial_number: string | null;
  purchase_date: string | null; // ISO yyyy-mm-dd
  price: string | null; // numeric string, INR
  store_name: string | null;
  warranty_months: number | null;
  confidence: "high" | "medium" | "low";
}

/** Editable fields for the add/edit product form. */
export interface ProductFormValues {
  name: string;
  brand: string;
  purchase_date: string;
  warranty_months: string;
  price: string;
  category: string;
  model_number: string;
  serial_number: string;
  store_name: string;
  notes: string;
}

// ── M3: Claims ────────────────────────────────────────────────────────────
// Mirrors lib/actions/claim.ts's ClaimMessage/ClaimSession (web). The native
// claims screen writes/reads `claim_sessions` directly via the native
// supabase client (RLS-scoped to `user_id = auth.uid()`, matching the
// pattern every other user-owned table in this codebase uses — the exact RLS
// policy text for claim_sessions wasn't in a migration file readable from
// this branch, so this is an assumption consistent with the rest of the
// schema, not a confirmed read).
export interface ClaimMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaimSession {
  id: string;
  product_id: string;
  issue: string;
  messages: ClaimMessage[];
  status: "open" | "resolved" | "escalated";
  created_at: string;
}

// ── M3: Subscriptions/Pricing ────────────────────────────────────────────
// Mirrors lib/actions/subscriptions.ts's SubscriptionPlan/UserSubscription
// (web). Plan ids seeded in supabase/migrations/20260612_bootstrap_
// quickscanz_schema.sql: "free", "pro_monthly", "pro_yearly".
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_inr: number;
  interval: "monthly" | "yearly" | "lifetime";
  product_limit: number;
  features: string[];
  razorpay_plan_id?: string | null;
}

export interface UserSubscription {
  id: string;
  plan_id: string;
  status: "active" | "cancelled" | "expired" | "trial";
  // current_period_end/cancel_at_period_end are read by lib/actions/
  // subscriptions.ts on the web but aren't part of the bootstrap migration's
  // create-table statement readable from this branch (likely added via a
  // later, untracked migration/dashboard change) — kept optional here so a
  // missing column doesn't break the native pricing screen.
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  plan?: SubscriptionPlan;
}
