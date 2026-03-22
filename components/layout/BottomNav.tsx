"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 8l7-5 7 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"}/>
        <path d="M8 17v-6h4v6" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/products",
    label: "Products",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"}/>
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"}/>
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"}/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"}/>
      </svg>
    ),
  },
  {
    href: "/products/add",
    label: "Add",
    icon: (_active: boolean) => (
      <div className="w-10 h-10 rounded-2xl bg-ink-900 flex items-center justify-center -mt-5 shadow-lg">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 4v10M4 9h10" stroke="#fdfcf8" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
    ),
    special: true,
  },
  {
    href: "/claim",
    label: "Claim AI",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 2V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"}/>
        <path d="M7 9h.5M10 9h.5M13 9h.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Account",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"}/>
        <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth={active ? "1.6" : "1.3"} strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-cream-200 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-end px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.special ? false : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 ${item.special ? "pt-0" : "pt-1"}`}
            >
              {item.icon(active)}
              {!item.special && (
                <span className={`text-[10px] font-medium transition-colors ${active ? "text-ink-900" : "text-ink-300"}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
