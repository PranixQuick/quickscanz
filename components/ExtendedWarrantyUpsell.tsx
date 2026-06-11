"use client";

import { Shield, ChevronRight } from "lucide-react";

interface Props {
  brand: string;
  productName: string;
  purchaseDateIso?: string | null; // yyyy-mm-dd
  category?: string;
}

// --- Eligibility: only show within 30 days of purchase ---
function isEligible(purchaseDateIso?: string | null): boolean {
  if (!purchaseDateIso) return true; // unknown date → always show
  try {
    const purchase = new Date(purchaseDateIso);
    const now = new Date();
    const diffDays = (now.getTime() - purchase.getTime()) / 86_400_000;
    return diffDays <= 30;
  } catch {
    return false;
  }
}

// --- Approximate annual premium based on category ---
function estimatePremium(category?: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("smartphone") || c.includes("laptop")) return "₹699–₹1,499/yr";
  if (c.includes("television") || c.includes("tv")) return "₹799–₹1,999/yr";
  if (c.includes("refrigerator") || c.includes("ac") || c.includes("washing")) return "₹599–₹1,299/yr";
  if (c.includes("two-wheeler")) return "₹1,199–₹2,499/yr";
  return "₹399–₹1,499/yr";
}

export default function ExtendedWarrantyUpsell({ brand, productName, purchaseDateIso, category }: Props) {
  if (!isEligible(purchaseDateIso)) return null;

  const q = encodeURIComponent(`${brand} ${productName}`);
  // GoWarranty affiliate deeplink.
  // TODO: Set NEXT_PUBLIC_GOWARRANTY_AFFILIATE_ID in Vercel env vars once your
  //       affiliate account is approved at https://gowarranty.in/partners
  //       The param name may be 'ref', 'aff_id', or 'partner' — confirm with GoWarranty.
  const affiliateId = process.env.NEXT_PUBLIC_GOWARRANTY_AFFILIATE_ID || "";
  const affiliateParam = affiliateId ? `&ref=${encodeURIComponent(affiliateId)}` : "";
  const url = `https://gowarranty.in/extended-warranty?q=${q}&utm_source=quickscanz&utm_medium=app&utm_content=product_detail${affiliateParam}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="ext-warranty-card"
      aria-label={`Extend warranty for ${brand} ${productName}`}
    >
      <div className="ext-warranty-card__icon">
        <Shield size={20} color="#d4b08c" />
      </div>
      <div style={{ flex: 1 }}>
        <div className="ext-warranty-card__title">Extend Your Warranty</div>
        <div className="ext-warranty-card__sub">
          Protect your {brand} {productName.length > 24 ? productName.slice(0,24)+"…" : productName} for up to 3 extra years.
        </div>
        <div className="ext-warranty-card__badge">{estimatePremium(category)}</div>
      </div>
      <ChevronRight size={18} color="rgba(253,252,248,0.5)" style={{ marginTop: 4 }} />
    </a>
  );
}
