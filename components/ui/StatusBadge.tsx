import { getWarrantyStatus, getStatusConfig } from "@/lib/utils";

interface StatusBadgeProps {
  expiryDate: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ expiryDate, size = "md" }: StatusBadgeProps) {
  const status = getWarrantyStatus(expiryDate);
  const config = getStatusConfig(status);

  return (
    <span
      className={`status-badge ${config.bg} ${config.color} border ${config.border} ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "expiring_soon" ? "animate-pulse" : ""}`} />
      {config.label}
    </span>
  );
}
