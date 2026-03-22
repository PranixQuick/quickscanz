"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { updateClaimSession, type ClaimMessage } from "@/lib/actions/claim";
import type { Product } from "@/lib/types";
import { getWarrantyStatus, formatDate } from "@/lib/utils";

interface Props {
  product: Product;
  sessionId: string;
  initialMessages?: ClaimMessage[];
}

const QUICK_ISSUES = [
  "Product stopped working",
  "Screen / display problem",
  "Battery drains too fast",
  "Physical damage",
  "Not cooling / heating",
  "Noise or vibration",
  "Software / connectivity issue",
  "Parts missing or broken",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1" fill="#c9bfb3"/>
          <rect x="8" y="1" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.5"/>
          <rect x="1" y="8" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.5"/>
          <rect x="8" y="8" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.25"/>
        </svg>
      </div>
      <div className="bg-cream-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Message({ msg }: { msg: ClaimMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#c9bfb3"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.5"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.5"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="#c9bfb3" opacity="0.25"/>
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-ink-900 text-cream-50 rounded-br-sm"
            : "bg-cream-100 text-ink-800 rounded-bl-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function ClaimAssistant({ product, sessionId, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<ClaimMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(initialMessages.length > 0);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const status = getWarrantyStatus(product.expiry_date);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callAI(userMessages: ClaimMessage[]) {
    setLoading(true);
    try {
      const systemPrompt = `You are QuickScanZ AI Claim Assistant — a knowledgeable, empathetic assistant helping Indian consumers navigate warranty claims and product issues.

PRODUCT CONTEXT:
- Product: ${product.name}
- Brand: ${product.brand}
- Category: ${(product as any).category || "Consumer Product"}
- Model: ${(product as any).model_number || "N/A"}
- Serial: ${(product as any).serial_number || "N/A"}
- Purchase Date: ${formatDate(product.purchase_date)}
- Warranty Expiry: ${formatDate(product.expiry_date)}
- Warranty Status: ${status}
- Price Paid: ${product.price ? `₹${Number(product.price).toLocaleString("en-IN")}` : "Not recorded"}
- Invoice stored: ${product.invoice_url ? "Yes" : "No"}
- Store: ${(product as any).store_name || "Not recorded"}

YOUR JOB:
1. Understand the issue clearly (ask 1-2 targeted questions if needed)
2. Determine if the issue is covered under warranty (manufacturing defect = covered; physical damage, liquid damage, misuse = NOT covered)
3. Provide step-by-step claim guidance specific to ${product.brand} in India
4. Generate a ready-to-send complaint email if appropriate
5. Mention what documents to carry to the service centre (invoice, warranty card, ID proof)
6. Be direct and actionable — Indian users need fast answers

WARRANTY COVERAGE RULES:
- Manufacturing defects: COVERED
- Physical damage, cracked screens, dents: NOT COVERED (unless accidental damage cover purchased)
- Liquid damage: NOT COVERED
- Normal wear and tear: NOT COVERED
- Software issues from official updates: Usually COVERED
- Accessories (charger, earphones): Usually NOT covered after 6 months

TONE: Friendly, confident, helpful. Use Indian context (₹, mention local processes). Keep responses concise — max 150 words unless generating an email.

If the warranty has expired, acknowledge it but still help them understand their options (extended warranty, out-of-warranty service rates, consumer court if product failed within reasonable lifespan).`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: userMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "I'm having trouble responding right now. Please try again.";

      const assistantMsg: ClaimMessage = { role: "assistant", content: text };
      const newMessages = [...userMessages, assistantMsg];
      setMessages(newMessages);

      // Persist to Supabase
      startTransition(async () => {
        await updateClaimSession(sessionId, newMessages);
      });
    } catch (err) {
      const errorMsg: ClaimMessage = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your internet and try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(issue: string) {
    setStarted(true);
    const greeting = `I need help with my ${product.brand} ${product.name}. Issue: ${issue}`;
    const userMsg: ClaimMessage = { role: "user", content: greeting };
    const newMessages = [userMsg];
    setMessages(newMessages);
    await callAI(newMessages);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: ClaimMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await callAI(newMessages);
  }

  if (!started) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-cream-100 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-white border border-cream-200 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#c9bfb3"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#c9bfb3" opacity="0.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#c9bfb3" opacity="0.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#c9bfb3" opacity="0.25"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-800 mb-0.5">QuickScanZ AI Assistant</p>
            <p className="text-xs text-ink-500 leading-relaxed">
              {status === "expired"
                ? `Your warranty expired on ${formatDate(product.expiry_date)}. I can still help you understand your out-of-warranty options.`
                : `Your ${product.brand} ${product.name} is under warranty until ${formatDate(product.expiry_date)}. Tell me what's wrong and I'll guide you through the claim process.`}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-2">What&apos;s the issue?</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ISSUES.map((issue) => (
              <button
                key={issue}
                onClick={() => handleStart(issue)}
                className="text-left text-xs px-3 py-2.5 bg-cream-100 hover:bg-cream-200 border border-cream-200 hover:border-sand-300 rounded-xl text-ink-600 transition-all leading-snug"
              >
                {issue}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or describe your issue in detail..."
            rows={2}
            className="flex-1 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none"
          />
          <button
            onClick={() => input.trim() && handleStart(input.trim())}
            disabled={!input.trim()}
            className="px-4 bg-ink-900 text-cream-50 rounded-xl hover:bg-ink-700 transition-colors disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "440px" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-cream-200 flex gap-2 mt-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your response... (Enter to send)"
          rows={2}
          disabled={loading}
          className="flex-1 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300 resize-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-4 bg-ink-900 text-cream-50 rounded-xl hover:bg-ink-700 transition-colors disabled:opacity-40 self-end pb-2.5 pt-2.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-ink-300 mt-1.5 text-center">AI guidance · Not legal advice · Shift+Enter for new line</p>
    </div>
  );
}
