"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 8.5L10 2l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5Z"
          stroke="currentColor"
          strokeWidth={active ? "1.8" : "1.4"}
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? "0.12" : "0"}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/products",
    label: "Products",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.4"} fill={active ? "currentColor" : "none"} fillOpacity="0.12"/>
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.4"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"}/>
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.4"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"}/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.4"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.06" : "0"}/>
      </svg>
    ),
  },
  {
    href: "/products/add",
    label: "Add",
    isAction: true,
    icon: (_active: boolean) => (
      <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center shadow-soft -mt-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="#fdfcf8" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-cream-50/90 backdrop-blur-md border-t border-cream-200 safe-bottom">
      <div className="max-w-2xl mx-auto px-2">
        <div className="flex items-end justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/products/add"
                ? pathname === "/products/add"
                : pathname.startsWith("/products") && pathname !== "/products/add";

            if (item.href === "/products/add") {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-4 py-1">
                  {item.icon(isActive)}
                  <span className="text-[10px] font-medium text-ink-500 mt-1">Add</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${isActive ? "text-ink-900" : "text-ink-400"}`}
              >
                {item.icon(isActive)}
                <span className={`text-[10px] font-medium ${isActive ? "text-ink-800" : "text-ink-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
