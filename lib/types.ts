export type WarrantyStatus = "active" | "expiring_soon" | "expired";

export interface Product {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  price: number | null;
  invoice_url: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface ProductFormData {
  name: string;
  brand: string;
  purchase_date: string;
  warranty_months: number;
  price: string;
  invoice?: File;
}

export interface DashboardStats {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
}

// ─── Future Phase 2/3 Scaffolding ────────────────────────────────────────────

export interface ProductIntelligence {
  id: string;
  product_id: string;
  avg_lifespan_months: number | null;
  failure_rate_pct: number | null;
  common_issues: string[] | null;
  last_updated: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  price: number;
  recorded_at: string;
  source: string | null;
}

export interface FailureReport {
  id: string;
  product_id: string;
  user_id: string;
  description: string;
  reported_at: string;
  resolved: boolean;
}

export interface Recommendation {
  id: string;
  user_id: string;
  product_id: string;
  reason: string;
  score: number;
  created_at: string;
}

export interface InvoiceCapture {
  id: string;
  user_id: string;
  source: "whatsapp" | "email" | "sms" | "bank" | "manual";
  raw_content: string | null;
  parsed_product_id: string | null;
  status: "pending" | "parsed" | "failed";
  captured_at: string;
}
