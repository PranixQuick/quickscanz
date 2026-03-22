import type { DashboardStats } from "@/lib/types";

interface StatsGridProps {
  stats: DashboardStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#786e62"/>
          <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#786e62" opacity="0.5"/>
          <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#786e62" opacity="0.5"/>
          <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#786e62" opacity="0.25"/>
        </svg>
      ),
      color: "text-ink-800",
      sublabel: "products",
    },
    {
      label: "Active",
      value: stats.active,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="#7aa67a" strokeWidth="1.4"/>
          <path d="M5.5 8l2 2 3-3" stroke="#7aa67a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "text-sage-500",
      sublabel: "warranties",
    },
    {
      label: "Expiring",
      value: stats.expiringSoon,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="#d97706" strokeWidth="1.4"/>
          <path d="M8 5v3.5l2 1.5" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: stats.expiringSoon > 0 ? "text-amber-600" : "text-ink-400",
      sublabel: "within 30d",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            {item.icon}
            <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wider">{item.label}</span>
          </div>
          <div className={`font-display text-3xl font-light ${item.color} leading-none mb-1`}>{item.value}</div>
          <div className="text-[10px] text-ink-300">{item.sublabel}</div>
        </div>
      ))}
    </div>
  );
}
