"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { getWarrantyStatus, formatDate, getDaysRemaining } from "@/lib/utils";
import { getProductIntelligence } from "@/lib/intelligence";

const SUPPORT_CONTACTS: Record<string, { phone: string; url: string }> = {
  samsung: { phone: "1800-5-726786", url: "https://www.samsung.com/in/support/" },
  apple: { phone: "1800-108-4357", url: "https://support.apple.com/en-in" },
  lg: { phone: "1800-315-9999", url: "https://www.lg.com/in/support/" },
  sony: { phone: "1800-103-7799", url: "https://www.sony.co.in/support/" },
  bosch: { phone: "1800-266-1880", url: "https://www.bosch-home.com/in/" },
  whirlpool: { phone: "1800-208-1800", url: "https://www.whirlpoolindia.com/" },
  dell: { phone: "1800-123-3355", url: "https://www.dell.com/support/home/en-in" },
  hp: { phone: "1800-108-4747", url: "https://support.hp.com/in-en" },
  lenovo: { phone: "1800-419-7555", url: "https://support.lenovo.com/in/en" },
  ifb: { phone: "1860-425-5422", url: "https://www.ifbappliances.com/support" },
  voltas: { phone: "1800-266-4555", url: "https://www.voltasservice.com/" },
  daikin: { phone: "1800-102-9300", url: "https://www.daikinindia.com/service-support" },
  hitachi: { phone: "1800-102-1930", url: "https://www.hitachi-appliances.co.in/" },
  carrier: { phone: "1800-103-5577", url: "https://www.carrierindia.com/" },
  bluestar: { phone: "1800-209-1177", url: "https://www.bluestarindia.com/support" },
  godrej: { phone: "1800-209-5511", url: "https://www.godrej.com/godrej-appliances" },
  haier: { phone: "1800-419-9999", url: "https://www.haier.com/in/support/" },
  panasonic: { phone: "1800-103-1333", url: "https://www.panasonic.com/in/support.html" },
  onida: { phone: "1800-200-2667", url: "https://www.onida.com/services/service-centers" },
};

function getSupportContact(brand: string) {
  return SUPPORT_CONTACTS[brand.toLowerCase()] ?? null;
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-cream-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="font-mono text-[10px] font-semibold text-ink-500">{num}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-ink-800">{title}</p>
        <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

interface GetHelpModalProps {
  product: Product;
}

export default function GetHelpModal({ product }: GetHelpModalProps) {
  const [open, setOpen] = useState(false);

  const status = getWarrantyStatus(product.expiry_date);
  const support = getSupportContact(product.brand);
  const intel = getProductIntelligence(product.name, product.brand);
  const daysLeft = getDaysRemaining(product.expiry_date);
  const isUnderWarranty = status === "active" || status === "expiring_soon";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-ink-900 text-cream-50 font-body font-medium text-base transition-all hover:bg-ink-800 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 8v5M9 5.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Get Help with This Product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-cream-50 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-cream-300" />
            </div>

            <div className="px-6 pt-4 pb-5 border-b border-cream-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-light text-ink-900">
                    {isUnderWarranty ? "You're covered" : "Warranty expired"}
                  </h2>
                  <p className="text-sm text-ink-400 mt-0.5">{product.name}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-cream-200 flex items-center justify-center flex-shrink-0 hover:bg-cream-300 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2L2 10" stroke="#786e62" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {isUnderWarranty ? (
                <div className="flex items-start gap-3 p-4 bg-sage-100 border border-sage-200 rounded-2xl">
                  <div className="w-9 h-9 rounded-xl bg-sage-200 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="#4e894e" strokeWidth="1.3"/>
                      <path d="M5 8l2.5 2.5L11 5.5" stroke="#4e894e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sage-700">
                      {status === "expiring_soon"
                        ? `Warranty valid — ${daysLeft} days left`
                        : `Warranty valid — ${Math.floor(daysLeft / 30)} months left`}
                    </p>
                    <p className="text-xs text-sage-600 mt-0.5">
                      Expires {formatDate(product.expiry_date)} · Your repair may be free or low-cost.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-blush-100 border border-blush-200 rounded-2xl">
                  <div className="w-9 h-9 rounded-xl bg-blush-200 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="#d95f54" strokeWidth="1.3"/>
                      <path d="M8 5v3M8 10v.5" stroke="#d95f54" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blush-700">
                      Warranty expired {Math.abs(daysLeft)} days ago
                    </p>
                    <p className="text-xs text-blush-600 mt-0.5">
                      Repair costs will apply. Compare service center vs local repair.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">What to do now</p>
                <div className="space-y-3">
                  {isUnderWarranty ? (
                    <>
                      <Step num="1" title="Call brand support" desc={support ? `Toll-free: ${support.phone}` : `Search "${product.brand} customer care" for the number.`}/>
                      <Step num="2" title="Keep your invoice ready" desc="They will ask for purchase date and invoice. It's stored here — tap to view."/>
                      <Step num="3" title="Request warranty repair" desc="Insist on a warranty claim if your issue is a manufacturing defect. Ask for a job card."/>
                      <Step num="4" title="Escalate if needed" desc="If the service center denies the claim, escalate to the brand's customer care email or consumer forum."/>
                    </>
                  ) : (
                    <>
                      <Step num="1" title="Contact brand service center" desc={`They offer out-of-warranty repairs.${support ? ` Call ${support.phone}.` : ""}`}/>
                      <Step num="2" title="Get a quote first" desc="Ask for a written cost estimate before authorizing any repair."/>
                      <Step num="3" title="Consider local repair" desc={`For a ${intel.category}, local repair shops are often 30–60% cheaper for common issues.`}/>
                      <Step num="4" title="Check extended warranty" desc="If you bought an extended warranty plan separately, check that paperwork — it may still be valid."/>
                    </>
                  )}
                </div>
              </div>

              {support && (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{product.brand} Support</p>
                  <div className="space-y-2">
                    <a href={`tel:${support.phone}`} className="flex items-center gap-3 p-3.5 bg-white border border-cream-200 rounded-xl hover:border-sand-300 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 3.5A1 1 0 0 1 3 2.5h1.5l1 2.5-1.5 1C4.8 7.7 6.5 9.4 8 10.3l1-1.5 2.5 1V11.5a1 1 0 0 1-1 1C4.5 13 2 7.5 2 3.5Z" stroke="#4e894e" strokeWidth="1.2"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-ink-400">Call toll-free</p>
                        <p className="text-sm font-semibold text-ink-800">{support.phone}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-300">
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </a>
                    <a href={support.url} rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 bg-white border border-cream-200 rounded-xl hover:border-sand-300 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-cream-200 flex items-center justify-center flex-shrink-0">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <circle cx="7.5" cy="7.5" r="6" stroke="#786e62" strokeWidth="1.2"/>
                          <path d="M7.5 1.5C6 3 5.5 5 5.5 7.5s.5 4.5 2 6" stroke="#786e62" strokeWidth="1" strokeLinecap="round"/>
                          <path d="M7.5 1.5C9 3 9.5 5 9.5 7.5s-.5 4.5-2 6" stroke="#786e62" strokeWidth="1" strokeLinecap="round"/>
                          <path d="M1.5 7.5h12" stroke="#786e62" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-ink-400">Support website</p>
                        <p className="text-sm font-semibold text-ink-800">{product.brand} Support Portal</p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-300">
                        <path d="M3 9L9 3M5.5 3H9v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              <div className="p-4 bg-cream-100 border border-cream-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{intel.categoryIcon}</span>
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">{intel.category} · Avg lifespan {intel.estimatedLifespanYears}</p>
                </div>
                <p className="text-sm text-ink-600 leading-relaxed">
                  {isUnderWarranty ? intel.tipWhenWorking : intel.tipWhenBroken}
                </p>
              </div>

              <p className="text-center text-xs text-ink-300 pb-2">
                Your invoice and product data stay private on this device.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
