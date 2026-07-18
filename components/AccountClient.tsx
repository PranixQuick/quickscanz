"use client";

import { useTransition, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import AariaAssistantButton from "@/components/ui/AariaAssistantButton";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  email: string;
  userId: string;
  productCount: number;
  smartDeviceCount: number;
  planId?: string;
  planName?: string;
}

export default function AccountClient({
  email, userId, productCount, smartDeviceCount,
  planId = "free", planName = "Free",
}: Props) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seeding, setSeeding] = useState(false);
  const isPro = planId !== "free";
  const username = email.split("@")[0];

  async function handleSeedDemoProducts() {
    setSeeding(true);
    try {
      const supabase = createClient();
      const demoProducts = [
        {
          user_id: userId,
          name: "Bravia XR 65-inch OLED TV",
          brand: "Sony",
          purchase_date: "2025-11-15",
          warranty_months: 24,
          expiry_date: "2027-11-15",
          price: 249900,
          category: "Television",
          subcategory: "OLED TV",
          model_number: "XR-65A80K",
          serial_number: "SN-9821034A",
          store_name: "Reliance Digital",
          notes: "Premium OLED TV. Outstanding picture quality.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "MacBook Pro 16-inch M3 Max",
          brand: "Apple",
          purchase_date: "2026-01-10",
          warranty_months: 12,
          expiry_date: "2027-01-10",
          price: 349900,
          category: "Laptop",
          subcategory: "Developer Laptop",
          model_number: "A2991",
          serial_number: "C02L91Z0Q05D",
          store_name: "Apple Store Mumbai",
          notes: "Workhorse machine for development and rendering.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "800L Bespoke French Door Refrigerator",
          brand: "Samsung",
          purchase_date: "2025-05-20",
          warranty_months: 12,
          expiry_date: "2026-05-20",
          price: 189900,
          category: "Home Appliance",
          subcategory: "Refrigerator",
          model_number: "RF23BB8600AP",
          serial_number: "SAMSUNG-BESPOKE-921",
          store_name: "Samsung Smart Plaza",
          notes: "Smart fridge with customizable panel designs.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "V15 Detect Cordless Vacuum",
          brand: "Dyson",
          purchase_date: "2025-09-05",
          warranty_months: 24,
          expiry_date: "2027-09-05",
          price: 65900,
          category: "Home Appliance",
          subcategory: "Vacuum Cleaner",
          model_number: "V15-DETECT",
          serial_number: "DYSON-V15-39210",
          store_name: "Dyson Demo Clinic",
          notes: "High-performance cordless vacuum with laser illumination.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "OnePlus 12 (16GB RAM, 512GB)",
          brand: "OnePlus",
          purchase_date: "2026-03-01",
          warranty_months: 12,
          expiry_date: "2027-03-01",
          price: 69990,
          category: "Smartphone",
          subcategory: "Android Flagship",
          model_number: "CPH2581",
          serial_number: "OP12-99881023",
          store_name: "OnePlus Experience Store",
          notes: "Daily driver phone. Fast charging is incredible.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "8kg Front Load Washing Machine",
          brand: "Bosch",
          purchase_date: "2025-02-14",
          warranty_months: 36,
          expiry_date: "2028-02-14",
          price: 48500,
          category: "Washing Machine",
          subcategory: "Front Load Washer",
          model_number: "WAJ2846SIN",
          serial_number: "BOSCH-WASHER-8KG",
          store_name: "Croma",
          notes: "Extremely silent and efficient. Uses EcoSilence Drive.",
          is_demo: true
        },
        {
          user_id: userId,
          name: "1.5 Ton 5-Star Inverter AC",
          brand: "Daikin",
          purchase_date: "2025-04-10",
          warranty_months: 12,
          expiry_date: "2026-04-10",
          price: 52000,
          category: "Air Conditioner",
          subcategory: "Split AC",
          model_number: "FTKM50U",
          serial_number: "DAIKIN-AC-15TON",
          store_name: "Vijay Sales",
          notes: "Living room AC. Great cooling efficiency.",
          is_demo: true
        }
      ];

      const { error } = await supabase.from("products").insert(demoProducts);
      if (error) throw error;
      toast.success("Seeded 7 premium demo products successfully!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed products");
    } finally {
      setSeeding(false);
    }
  }

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success(t("account.signed_out_toast"));
      router.push("/login");
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">{t("nav.account")}</h1>
        <p className="text-sm text-ink-400 mt-1">{t("account.subtitle")}</p>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center text-cream-100 font-display text-xl font-light">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-ink-900">{username}</p>
            <p className="text-xs text-ink-400">{email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-cream-100">
          {[
            { label: t("nav.products"), value: productCount },
            { label: t("account.smart_devices_label"), value: smartDeviceCount },
            { label: t("account.plan_label"), value: planName },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-lg font-light text-ink-900">{s.value}</p>
              <p className="text-[10px] text-ink-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {!isPro && (
        <Link href="/pricing" className="block card p-4 bg-gradient-to-r from-sand-100 to-cream-100 border-sand-200 group hover:border-sand-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sand-200 flex items-center justify-center text-xl flex-shrink-0">⭐</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">{t("account.upgrade_to_pro")}</p>
              <p className="text-xs text-ink-500 mt-0.5">{t("account.upgrade_to_pro_desc")}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sand-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Link>
      )}

      {/* Aaria voice assistant */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Assistant</p>
        <AariaAssistantButton />
      </div>

      {/* Notifications */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("account.notifications_header")}</p>
        <NotificationSettings userId={userId} />
        <p className="text-[11px] text-ink-300 mt-2 px-1">{t("account.pwa_push_note")}</p>
      </div>

      {/* Warranty Features */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("account.features_header")}</p>
        <div className="space-y-1">
          {[
            { href: "/products",          icon: "📦", label: t("account.menu_all_products") },
            { href: "/products/lifecycle", icon: "📊", label: t("account.menu_lifecycle") },
            { href: "/claim",             icon: "🤖", label: t("account.menu_claim_assistant") },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Intelligence */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">{t("account.intelligence_header")}</p>
        <p className="text-[10px] text-ink-300 mb-3 px-1">{t("account.intelligence_phase2_note")}</p>
        <div className="space-y-1">
          {[
            { href: "/compare",          icon: "⚖️", label: t("account.menu_compare") },
            { href: "/buying-assistant", icon: "🛒", label: t("account.menu_buying_assistant") },
            { href: "/energy",           icon: "⚡", label: t("account.menu_energy") },
            { href: "/smart-devices",    icon: "🏠", label: t("account.menu_smart_devices") },
            { href: "/iot-hub",          icon: "🔗", label: t("account.menu_iot_hub") },
            {
              href: "/family",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-600 shrink-0">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
              label: t("account.menu_family_vault")
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
              <span className="text-base flex items-center justify-center w-5 h-5">{item.icon}</span>
              <span className="text-sm text-ink-700 flex-1">{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("account.billing_header")}</p>
        <Link href="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors group">
          <span className="text-base">💳</span>
          <span className="text-sm text-ink-700 flex-1">{isPro ? planName + " " + t("account.plan_manage") : t("account.upgrade_view_plans")}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-200 group-hover:text-ink-400"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </Link>
      </div>

      {/* Developer & Testing Tools */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Testing & Development</p>
        <button
          onClick={handleSeedDemoProducts}
          disabled={seeding}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 transition-colors text-sm font-semibold text-ink-700 disabled:opacity-40"
        >
          {seeding ? "Seeding Products..." : "🌱 Seed Premium Demo Products"}
        </button>
      </div>

      {/* Legal */}
      <div>
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{t("account.legal_header")}</p>
        <div className="space-y-1">
          {[{ href: "/privacy-policy", label: t("account.privacy_policy") }, { href: "/about", label: t("account.about_app") }].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-colors">
              <span className="text-sm text-ink-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <button onClick={handleSignOut} disabled={isPending} className="w-full py-3.5 text-sm font-medium text-blush-500 hover:text-blush-600 hover:bg-blush-50/50 rounded-xl transition-colors disabled:opacity-40 border border-transparent hover:border-blush-200">
        {isPending ? t("account.signing_out") : t("account.sign_out_btn")}
      </button>

      {/* Delete account — required by Google Play Data Safety & DPDP Act */}
      <div className="pt-2 border-t border-cream-200">
        <p className="text-[10px] text-ink-300 text-center mb-3">{t("account.danger_zone")}</p>
        <a
          href={`mailto:privacy@quickscanz.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20data.%20Registered%20email%3A%20${encodeURIComponent(email)}`}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-ink-300 hover:text-blush-500 hover:bg-blush-50/30 rounded-xl transition-colors border border-transparent hover:border-blush-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          {t("account.delete_account_btn")}
        </a>
      </div>

      <p className="text-center text-[10px] text-ink-200 pb-2">QuickScanZ · v2.0</p>
    </div>
  );
}
