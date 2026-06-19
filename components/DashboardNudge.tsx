"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, Bell, Wrench, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";

interface NudgeData {
  type: "expiring_soon" | "no_products" | "try_claim_ai" | "review_expiry" | "amc_reminder";
  title: string;
  sub: string;
  href: string;
  icon: "bell" | "wrench" | "shield" | "star";
}

const ICONS = {
  bell: <Bell size={18} color="#c4956f" />,
  wrench: <Wrench size={18} color="#c4956f" />,
  shield: <ShieldAlert size={18} color="#c4956f" />,
  star: <Star size={18} color="#c4956f" />,
};

export default function DashboardNudge() {
  const [nudge, setNudge] = useState<NudgeData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function compute() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // IMPORTANT: exclude demo products — nudge must only reflect real user data
      const { data: products } = await supabase
        .from("products")
        .select("id, name, brand, purchase_date, warranty_years, category, is_demo")
        .eq("user_id", user.id)
        .eq("is_demo", false)
        .order("created_at", { ascending: false });

      // No real products yet — hide nudge entirely; the demo banner on the dashboard handles this state
      if (!products || products.length === 0) return;

      const now = new Date();

      // 1. Check for warranties expiring in ≤60 days
      for (const p of products) {
        if (p.purchase_date && p.warranty_years) {
          const expiry = new Date(p.purchase_date);
          expiry.setFullYear(expiry.getFullYear() + p.warranty_years);
          const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
          if (daysLeft > 0 && daysLeft <= 60) {
            setNudge({
              type: "expiring_soon",
              title: `${p.name} warranty ends in ${daysLeft}d`,
              sub: "Tap to review or extend before it lapses.",
              href: `/products/${p.id}`,
              icon: "bell",
            });
            return;
          }
        }
      }

      // 2. Prompt AMC check for products >1 year old
      const oldProducts = products.filter(p => {
        if (!p.purchase_date) return false;
        const diffYears = (now.getTime() - new Date(p.purchase_date).getTime()) / (365.25 * 86_400_000);
        return diffYears > 1;
      });
      if (oldProducts.length > 0) {
        const p = oldProducts[0];
        setNudge({
          type: "amc_reminder",
          title: `${p.name} — consider an AMC`,
          sub: "Annual Maintenance Contract protects post-warranty.",
          href: `/products/${p.id}`,
          icon: "wrench",
        });
        return;
      }

      // 3. Default: prompt to try Claim AI
      setNudge({
        type: "try_claim_ai",
        title: "Something not working?",
        sub: "Use AI Claim Assistant for step-by-step help.",
        href: "/claim",
        icon: "shield",
      });
    }
    compute();
  }, []);

  if (!nudge || dismissed) return null;

  return (
    <div style={{ position: "relative" }}>
      <Link href={nudge.href} className="nudge-card">
        <div className="nudge-card__icon">{ICONS[nudge.icon]}</div>
        <div className="nudge-card__body">
          <div className="nudge-card__title">{nudge.title}</div>
          <div className="nudge-card__sub">{nudge.sub}</div>
        </div>
        <ChevronRight size={16} className="nudge-card__arrow" />
      </Link>
      {/* Dismiss X */}
      <button
        onClick={e => { e.preventDefault(); setDismissed(true); }}
        style={{ position:"absolute", top:8, right:8, background:"none", border:"none",
                 cursor:"pointer", padding:4, color:"#b8a898", lineHeight:1 }}
        aria-label="Dismiss nudge"
      >
        ×
      </button>
    </div>
  );
}
