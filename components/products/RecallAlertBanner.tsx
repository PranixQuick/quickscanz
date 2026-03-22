"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SEVERITY_STYLES = {
  low:      { bg: "bg-cream-100",  border: "border-cream-200",  text: "text-ink-600",    badge: "bg-cream-200 text-ink-500",     icon: "⚠️" },
  medium:   { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-800",  badge: "bg-amber-100 text-amber-600",   icon: "⚠️" },
  high:     { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-600", icon: "🔔" },
  critical: { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-800",    badge: "bg-red-100 text-red-600",       icon: "🚨" },
};

interface RecallAlert {
  id: string;
  brand: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action_required: string;
  issued_date: string;
}

export default function RecallAlertBanner({ brand }: { brand: string }) {
  const [alerts, setAlerts] = useState<RecallAlert[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("recall_alerts")
      .select("*")
      .eq("brand", brand)
      .eq("is_active", true)
      .then(({ data }) => setAlerts((data as RecallAlert[]) || []));
  }, [brand]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium;
        return (
          <div key={alert.id} className={`rounded-2xl p-4 border ${style.bg} ${style.border}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}>
                    {alert.severity} recall
                  </span>
                  <span className="text-[10px] text-ink-300">{new Date(alert.issued_date).getFullYear()}</span>
                </div>
                <p className={`text-sm font-medium ${style.text}`}>{alert.title}</p>
                <p className={`text-xs mt-1 ${style.text} opacity-80`}>{alert.description}</p>
                <p className={`mt-2 text-xs font-medium ${style.text}`}>→ {alert.action_required}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
