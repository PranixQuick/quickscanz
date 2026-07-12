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
