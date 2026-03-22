import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/actions/products";
import AppLayout from "@/components/layout/AppLayout";
import ClaimAssistant from "@/components/ai/ClaimAssistant";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Claim Assistant | QuickScanZ",
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const products = await getProducts();
  const realProducts = products.filter((p) => !p.is_demo);

  if (realProducts.length === 0) redirect("/products/add");

  const selected = searchParams.product
    ? realProducts.find((p) => p.id === searchParams.product) || realProducts[0]
    : realProducts[0];

  const sessionId = `${selected.id}_${Date.now()}`;

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">AI Claim Assistant</h1>
          <p className="text-sm text-ink-400 mt-1">Get guided through your warranty claim, step by step.</p>
        </div>

        {realProducts.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {realProducts.map((p) => (
              <a key={p.id} href={`/claim?product=${p.id}`}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs transition-all ${
                  p.id === selected.id
                    ? "bg-ink-900 border-ink-900 text-cream-50"
                    : "bg-cream-100 border-cream-200 text-ink-600"
                }`}>
                {p.brand} {p.name}
              </a>
            ))}
          </div>
        )}

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-lg">🔧</div>
          <div>
            <p className="text-sm font-medium text-ink-900">{selected.brand} {selected.name}</p>
            <p className="text-xs text-ink-400">
              Warranty until {new Date(selected.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="card p-4">
          <ClaimAssistant product={selected} sessionId={sessionId} initialMessages={[]} />
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 bg-cream-100 rounded-xl">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
            <circle cx="6" cy="6" r="5" stroke="#c9bfb3" strokeWidth="1"/>
            <path d="M6 5v4M6 3.5v.5" stroke="#c9bfb3" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <p className="text-[11px] text-ink-400 leading-relaxed">
            AI guidance is informational only. Actual warranty coverage depends on your specific terms.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
