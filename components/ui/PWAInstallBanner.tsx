"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useState } from "react";

export default function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="card p-4 border-sand-300 bg-gradient-to-r from-cream-100 to-sand-100/40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8"/>
            <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
            <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.55"/>
            <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill="#fdfcf8" opacity="0.25"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-800">Install QuickScanZ</p>
          <p className="text-xs text-ink-400">Add to home screen for quick access</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={install} className="btn-primary text-xs px-3 py-1.5">Install</button>
          <button onClick={() => setDismissed(true)} className="text-ink-300 hover:text-ink-500 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
