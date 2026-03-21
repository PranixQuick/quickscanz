"use client";

import { getDaysRemaining, getWarrantyStatus, formatWarrantyCountdown } from "@/lib/utils";

interface CountdownRingProps {
  expiryDate: string;
  warrantyMonths: number;
  purchaseDate: string;
}

export default function CountdownRing({ expiryDate, warrantyMonths }: CountdownRingProps) {
  const daysRemaining = getDaysRemaining(expiryDate);
  const totalDays = warrantyMonths * 30;
  const status = getWarrantyStatus(expiryDate);
  const label = formatWarrantyCountdown(expiryDate);
  const progress = Math.max(0, Math.min(1, daysRemaining / totalDays));

  const size = 120;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  const colors = { active: "#7aa67a", expiring_soon: "#d97706", expired: "#d95f54" };
  const color = colors[status];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ede0cc" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {daysRemaining > 0 ? (
            <>
              <span className="font-display text-2xl font-light text-ink-900 leading-none">
                {daysRemaining > 365 ? `${Math.floor(daysRemaining / 365)}y` : daysRemaining > 30 ? `${Math.floor(daysRemaining / 30)}m` : daysRemaining}
              </span>
              <span className="text-[10px] text-ink-400 mt-0.5">
                {daysRemaining > 365 ? "years" : daysRemaining > 30 ? "months" : "days"}
              </span>
            </>
          ) : (
            <span className="text-xs text-blush-500 font-medium text-center px-2">Expired</span>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-500 text-center">{label}</p>
    </div>
  );
}
