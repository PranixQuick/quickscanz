import type { Metadata } from "next";
import { getProducts } from "@/lib/actions/products";
import { getWarrantyStatus } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import ProductCard from "@/components/products/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Products | QuickScanZ",
  description: "All your tracked products and warranties.",
};

interface ProductsPageProps {
  searchParams: { status?: string };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const products = await getProducts();
  const filterStatus = searchParams?.status || null;

  const expiringSoon = products.filter((p) => getWarrantyStatus(p.expiry_date) === "expiring_soon");
  const active = products.filter((p) => getWarrantyStatus(p.expiry_date) === "active");
  const expired = products.filter((p) => getWarrantyStatus(p.expiry_date) === "expired");

  // If filtering from dashboard card click, show only that section at top
  const sections = filterStatus
    ? [
        { label: "Expiring Soon", items: expiringSoon, show: filterStatus === "expiring_soon" || filterStatus === "all" },
        { label: "Active", items: active, show: filterStatus === "active" || filterStatus === "all" },
        { label: "Expired", items: expired, show: filterStatus === "expired" || filterStatus === "all" },
      ].filter((s) => s.show)
    : [
        { label: "Expiring Soon", items: expiringSoon, show: expiringSoon.length > 0 },
        { label: "Active", items: active, show: active.length > 0 },
        { label: "Expired", items: expired, show: expired.length > 0 },
      ];

  const shownProducts = filterStatus
    ? filterStatus === "active" ? active
      : filterStatus === "expiring_soon" ? expiringSoon
      : filterStatus === "expired" ? expired
      : products
    : products;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-light text-ink-900">My Products</h1>
            <p className="text-sm text-ink-400 mt-0.5">
              {filterStatus && filterStatus !== "all"
                ? `${shownProducts.length} ${filterStatus === "expiring_soon" ? "expiring soon" : filterStatus} · `
                : ""}
              {products.length} total tracked
            </p>
          </div>
          <Link href="/products/add" className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add
          </Link>
        </div>

        {/* Filter pills */}
        {products.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "All", href: "/products", active: !filterStatus },
              { label: "Active", href: "/products?status=active", active: filterStatus === "active" },
              { label: "Expiring", href: "/products?status=expiring_soon", active: filterStatus === "expiring_soon" },
              { label: "Expired", href: "/products?status=expired", active: filterStatus === "expired" },
            ].map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  f.active
                    ? "bg-ink-900 text-cream-100"
                    : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}

        {products.length === 0 && (
          <EmptyState
            title="Your warranty wallet is empty"
            description="Add a product to track its warranty and store the invoice. It takes less than 30 seconds."
            actionLabel="Add your first product"
            actionHref="/products/add"
          />
        )}

        {sections.map(({ label, items, show }) =>
          show ? (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{label}</h2>
                <span className="w-5 h-5 rounded-full bg-cream-200 text-[10px] font-medium text-ink-500 flex items-center justify-center">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map((product, i) => (
                  <div
                    key={product.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </AppLayout>
  );
}
