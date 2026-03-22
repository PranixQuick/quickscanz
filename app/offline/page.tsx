"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-cream-200 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M4 14h3M21 14h3M14 4v3M14 21v3" stroke="#c9bfb3" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="14" cy="14" r="8" stroke="#d4b08c" strokeWidth="1.5" strokeDasharray="4 3"/>
          <path d="M10 14a4 4 0 0 1 8 0" stroke="#c49572" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="14" cy="14" r="1.5" fill="#c49572"/>
        </svg>
      </div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-2">You&apos;re offline</h1>
      <p className="text-sm text-ink-400 max-w-xs leading-relaxed mb-6">
        No internet connection right now. Your product data is safely stored — reconnect to sync.
      </p>
      <div className="card p-4 max-w-xs w-full text-left mb-6">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-3">What you can do</p>
        <div className="space-y-2">
          {["View cached warranty details", "Check product expiry dates", "Note down what needs attention"].map((tip) => (
            <div key={tip} className="flex items-center gap-2 text-sm text-ink-600">
              <div className="w-1.5 h-1.5 rounded-full bg-sand-400 flex-shrink-0" />
              {tip}
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => window.location.reload()} className="btn-secondary">Try Again</button>
      <p className="text-xs text-ink-300 mt-8 flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1L9.5 3v2.5c0 2.3-1.7 4.1-4 4.5-2.3-.4-4-2.2-4-4.5V3L5.5 1Z" stroke="currentColor" strokeWidth="1"/>
        </svg>
        Your data is private and stored securely
      </p>
    </div>
  );
}
