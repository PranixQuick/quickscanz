"use client";

import { useState } from "react";

// Stakeholder friction launcher. A small floating button that opens a sheet with
// two modes — "Report an issue" and "Ask a question" — both posting to /api/support,
// which forwards to the Pranix engine intake. No new storage; reuse-only.
export default function SupportLauncher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"issue" | "question">("issue");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "unconfigured">("idle");

  async function submit() {
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mode,
          text: text.trim(),
          page: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      if (res.ok) { setStatus("sent"); setText(""); }
      else if (res.status === 503) setStatus("unconfigured");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setOpen(false);
    setStatus("idle");
    setText("");
    setMode("issue");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Get help or report an issue"
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-ink-900 text-cream-50 shadow-lg flex items-center justify-center hover:bg-ink-700 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a8 8 0 0 0-8 8c0 1.4.36 2.7 1 3.86L2 18l4.14-1A8 8 0 1 0 10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M7.5 8.2c0-1.3 1.1-2.2 2.5-2.2s2.5.9 2.5 2.1c0 1.6-2.1 1.7-2.1 3.1M10 13.6h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 px-3" onClick={reset}>
          <div className="w-full max-w-md bg-cream-50 rounded-2xl p-4 mb-4 sm:mb-0 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ink-900">How can we help?</p>
              <button onClick={reset} className="text-ink-400 text-lg leading-none px-2">×</button>
            </div>

            {status === "sent" ? (
              <div className="text-center py-6">
                <p className="text-sm font-medium text-ink-900 mb-1">Thanks — we&apos;ve got it.</p>
                <p className="text-xs text-ink-400">Your {mode === "question" ? "question" : "report"} has been routed to the Pranix team.</p>
                <button onClick={reset} className="btn-primary text-sm px-5 py-2 mt-4">Done</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {(["issue", "question"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-all ${
                        mode === m ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600"
                      }`}>
                      {m === "issue" ? "Report an issue" : "Ask a question"}
                    </button>
                  ))}
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder={mode === "issue" ? "Describe what went wrong…" : "What would you like to know?"}
                  className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none"
                />

                {status === "error" && <p className="text-xs text-red-600 mt-2">Couldn&apos;t send right now. Please try again.</p>}
                {status === "unconfigured" && <p className="text-xs text-ink-400 mt-2">Support channel isn&apos;t enabled yet.</p>}

                <button onClick={submit} disabled={!text.trim() || status === "sending"}
                  className="btn-primary text-sm px-5 py-2.5 mt-3 w-full disabled:opacity-40">
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
                <p className="text-[10px] text-ink-300 mt-2 text-center">Routed to Pranix support — we may follow up by email.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
