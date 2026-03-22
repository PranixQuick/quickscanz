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
  created_at: string;
  is_demo: boolean;
  // Phase 2 fields
  category?: string;
  subcategory?: string;
  model_number?: string;
  serial_number?: string;
  store_name?: string;
  installation_date?: string;
  extended_warranty_months?: number;
  manual_url?: string;
  notes?: string;
  catalog_product_id?: string;
}

export interface DashboardStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  withInvoice: number;
}

export type WarrantyStatus = "active" | "expiring_soon" | "expired";

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string | null;
  model_number: string | null;
  standard_warranty_months: number;
  avg_lifespan_years: number | null;
  support_phone: string | null;
  support_url: string | null;
  features: string[] | null;
  common_issues: string[] | null;
}

export interface ServiceCentre {
  id: string;
  brand: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string | null;
  email: string | null;
  timings: string | null;
  is_authorized: boolean;
}

export interface RecallAlert {
  id: string;
  brand: string;
  product_name: string;
  model_numbers: string[] | null;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action_required: string;
  source_url: string | null;
  issued_date: string;
}

export interface ClaimMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaimSession {
  id: string;
  user_id: string;
  product_id: string;
  issue: string;
  messages: ClaimMessage[];
  status: "open" | "resolved" | "escalated";
  created_at: string;
  updated_at: string;
}
