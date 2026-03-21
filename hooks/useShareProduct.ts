"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";
import type { Product } from "@/lib/types";
import { formatDate, formatWarrantyCountdown, getWarrantyStatus, getStatusConfig } from "@/lib/utils";

export function useShareProduct() {
  const share = useCallback(async (product: Product) => {
    const status = getWarrantyStatus(product.expiry_date);
    const config = getStatusConfig(status);
    const countdown = formatWarrantyCountdown(product.expiry_date);

    const text = [
      `📦 ${product.name} — ${product.brand}`,
      `Status: ${config.label}`,
      `Purchased: ${formatDate(product.purchase_date)}`,
      `Warranty expires: ${formatDate(product.expiry_date)}`,
      `${countdown}`,
      ``,
      `via QuickScanZ`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Warranty info copied to clipboard");
  }, []);

  return share;
}
