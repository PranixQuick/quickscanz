"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment…");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const orderId = searchParams.get("razorpay_order_id");
    const paymentId = searchParams.get("razorpay_payment_id");
    const signature = searchParams.get("razorpay_signature");
    const planId = searchParams.get("plan_id");
    const linkStatus = searchParams.get("razorpay_payment_link_status");

    if (linkStatus && linkStatus !== "paid") {
      setStatus("failed");
      setMessage("Payment was not completed. Please try again.");
      setTimeout(() => router.replace("/pricing"), 3000);
      return;
    }

    if (!orderId || !paymentId || !signature || !planId) {
      setStatus("failed");
      setMessage("Invalid payment response. Please contact support if money was deducted.");
      setTimeout(() => router.replace("/pricing"), 4000);
      return;
    }

    fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId, signature, planId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage("Payment confirmed! Welcome to QuickScanZ Pro.");
          setTimeout(() => router.replace("/account?upgraded=1"), 2000);
        } else {
          setStatus("failed");
          setMessage(data.error || "Verification failed. Please contact support.");
          setTimeout(() => router.replace("/pricing"), 4000);
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Network error during verification. Please contact support.");
        setTimeout(() => router.replace("/pricing"), 4000);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6">
        {status === "verifying" && (
          <div className="w-16 h-16 rounded-3xl bg-cream-200 flex items-center justify-center">
            <svg className="animate-spin w-8 h-8 text-sand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {status === "success" && (
          <div className="w-16 h-16 rounded-3xl bg-sage-100 border border-sage-200 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l7 7 13-13" stroke="#7aa67a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {status === "failed" && (
          <div className="w-16 h-16 rounded-3xl bg-blush-100 border border-blush-200 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 8l16 16M24 8L8 24" stroke="#d95f54" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-2">
        {status === "verifying" && "Confirming Payment"}
        {status === "success" && "Payment Successful!"}
        {status === "failed" && "Payment Issue"}
      </h1>
      <p className="text-sm text-ink-400 max-w-xs leading-relaxed">{message}</p>
      {status !== "verifying" && (
        <p className="text-xs text-ink-300 mt-6">Redirecting you automatically…</p>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-sand-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
