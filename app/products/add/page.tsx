import type { Metadata } from "next";
import AppLayout from "@/components/layout/AppLayout";
import AddProductForm from "@/components/products/AddProductForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Add Product",
  description: "Add a new product to track its warranty.",
};

export default function AddProductPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 mb-4 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <h1 className="font-display text-2xl font-light text-ink-900">Add Product</h1>
          <p className="text-sm text-ink-400 mt-1">Track warranty and store your invoice in one place.</p>
        </div>
        <div className="card p-6">
          <AddProductForm />
        </div>
        <p className="text-center text-xs text-ink-300 flex items-center justify-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1L9.5 3v2.5c0 2.3-1.7 4.1-4 4.5-2.3-.4-4-2.2-4-4.5V3L5.5 1Z" stroke="currentColor" strokeWidth="1"/>
          </svg>
          Invoices are stored privately and securely
        </p>
      </div>
    </AppLayout>
  );
}
