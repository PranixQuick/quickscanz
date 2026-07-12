import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { apiFetch, ApiAuthError } from "../../src/lib/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getWarrantyStatus } from "../../src/lib/calculations";
import type { Product, ClaimMessage } from "../../src/lib/types";

// Mirrors components/ai/ClaimAssistant.tsx (web): same quick-issue chips,
// same POST /api/ai contract (model/max_tokens/system/messages/product_id),
// same "keep going even if the AI call fails" fallback behaviour. Unlike the
// web version's i18n-keyed fallback copy, this uses plain English strings
// (native i18n wiring is a follow-up — see native/NATIVE_APP_PLAN.md).
//
// claim_sessions rows are written directly via the native supabase client
// (RLS-scoped to the signed-in user, same as lib/actions/claim.ts's server
// actions) instead of through a Next.js route, since these are plain table
// reads/writes with no server-only secret involved — only the actual AI
// generation call needs the Next.js API (see src/lib/api.ts for the
// Bearer-auth caveat on that call).
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

const PRODUCT_COLUMNS =
  "id, user_id, name, brand, purchase_date, warranty_months, expiry_date, price, invoice_url, created_at, category, model_number, serial_number, store_name, notes";

function buildSystemPrompt(product: Product): string {
  const status = getWarrantyStatus(product.expiry_date);
  return `You are QuickScanZ AI Claim Assistant — a knowledgeable, empathetic assistant helping Indian consumers navigate warranty claims.

PRODUCT CONTEXT:
- Product: ${product.name}
- Brand: ${product.brand}
- Category: ${product.category || "Consumer Product"}
- Model: ${product.model_number || "N/A"}
- Purchase Date: ${product.purchase_date}
- Warranty Expiry: ${product.expiry_date}
- Warranty Status: ${status}
- Price Paid: ${product.price ? `₹${Number(product.price).toLocaleString("en-IN")}` : "Not recorded"}
- Invoice stored: ${product.invoice_url ? "Yes" : "No"}
- Store: ${product.store_name || "Not recorded"}

RULES:
- Manufacturing defects: COVERED
- Physical/liquid damage: NOT COVERED
- Keep responses under 150 words unless drafting an email
- Use Indian context (₹, local processes, Consumer Protection Act 2019)
- If warranty expired, still help with out-of-warranty options`;
}

function fallbackMessage(product: Product): ClaimMessage {
  const status = getWarrantyStatus(product.expiry_date);
  const isExpired = status === "expired";
  const hasInvoice = !!product.invoice_url;
  const lines = [
    isExpired
      ? `Your ${product.name} warranty expired on ${product.expiry_date}. You can still pursue a paid repair, or for defects reported soon after expiry, ask the brand for goodwill service.`
      : `Your ${product.name} is covered until ${product.expiry_date}. Here's how to proceed:`,
    "",
    "How to file this claim:",
    "",
    hasInvoice
      ? `1. You already have an invoice saved for ${product.name} — bring it along.`
      : `1. Locate your invoice/receipt for ${product.name} — service centres usually require it.`,
    `2. Visit an authorized ${product.brand} service centre (not a third-party repair shop).`,
    "3. Ask for a written job card when you submit the product.",
    "4. Repairs must be completed within 30 days under the Consumer Protection Act, 2019.",
    "5. If rejected, request the reason in writing and escalate to the National Consumer Helpline: 1800-11-4000.",
    "",
    "Tip: photograph the defect before you hand the product over.",
  ];
  return { role: "assistant", content: lines.join("\n") };
}

export default function ClaimsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoadingProducts(false);
      return;
    }
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("user_id", user.id)
      .eq("is_demo", false)
      .order("expiry_date", { ascending: true });
    const list = (data as Product[] | null) ?? [];
    setProducts(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    setLoadingProducts(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selected = products.find((p) => p.id === selectedId) ?? null;

  function resetConversation(nextId: string) {
    setSelectedId(nextId);
    setSessionId(null);
    setMessages([]);
    setStarted(false);
    setLimitReached(false);
    setAuthWarning(null);
    setInput("");
  }

  async function ensureSession(product: Product, issue: string): Promise<string | null> {
    if (sessionId) return sessionId;
    if (!user) return null;
    const { data, error } = await supabase
      .from("claim_sessions")
      .insert({ user_id: user.id, product_id: product.id, issue, messages: [], status: "open" })
      .select("id")
      .single();
    if (error || !data) return null;
    setSessionId(data.id);
    return data.id;
  }

  async function persistSession(sid: string, nextMessages: ClaimMessage[]) {
    await supabase
      .from("claim_sessions")
      .update({ messages: nextMessages, status: "open", updated_at: new Date().toISOString() })
      .eq("id", sid);
  }

  async function callAI(product: Product, nextMessages: ClaimMessage[], sid: string | null) {
    setSending(true);
    setAuthWarning(null);
    try {
      const res = await apiFetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: buildSystemPrompt(product),
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          product_id: product.id,
        }),
      });

      if (res.status === 401) {
        // Expected until /api/ai gets a Bearer-token fallback — see
        // src/lib/api.ts's doc comment. Fall back to local guidance instead
        // of a dead-end error screen.
        setAuthWarning(
          "AI claim guidance isn't reachable from the app yet (a small server auth update is pending) — showing general guidance instead."
        );
        const fb = fallbackMessage(product);
        const withFallback = [...nextMessages, fb];
        setMessages(withFallback);
        if (sid) await persistSession(sid, withFallback);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data._usage_limit_reached) setLimitReached(true);

      const text: string = data?.content?.[0]?.text ?? "Please describe your issue and I'll help with your claim.";
      const assistantMsg: ClaimMessage = { role: "assistant", content: text };
      const withReply = [...nextMessages, assistantMsg];
      setMessages(withReply);
      if (sid) await persistSession(sid, withReply);
    } catch (e) {
      if (e instanceof ApiAuthError) {
        setAuthWarning("You're signed out — please sign back in to use the claim assistant.");
      }
      const fb = fallbackMessage(product);
      const withFallback = [...nextMessages, fb];
      setMessages(withFallback);
      if (sid) await persistSession(sid, withFallback);
    } finally {
      setSending(false);
    }
  }

  async function handleStart(issue: string) {
    if (!selected) return;
    setStarted(true);
    const userMsg: ClaimMessage = { role: "user", content: `I have an issue with my ${selected.name}: ${issue}` };
    const next = [userMsg];
    setMessages(next);
    const sid = await ensureSession(selected, issue);
    await callAI(selected, next, sid);
  }

  async function handleSend() {
    if (!selected || !input.trim() || sending || limitReached) return;
    const userMsg: ClaimMessage = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    const sid = sessionId ?? (await ensureSession(selected, input.trim()));
    setInput("");
    await callAI(selected, next, sid);
  }

  if (loadingProducts) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <ActivityIndicator />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-cream-100 px-8 py-12">
        <Text className="text-2xl font-bold text-ink-700">Claims</Text>
        <Text className="text-center text-ink-500">
          Add a product to your Warranty Wallet first — the claim assistant needs a product to give you specific
          guidance.
        </Text>
        <Pressable
          onPress={() => router.push("/product/add")}
          className="mt-2 rounded-2xl bg-brand-500 px-6 py-3 active:opacity-90"
        >
          <Text className="font-semibold text-white">Add a product</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream-100"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View className="px-6 pb-2 pt-12">
        <Text className="text-2xl font-bold text-ink-700">Claims</Text>
        <Text className="mt-1 text-sm text-ink-500">AI-guided help for warranty issues, product by product.</Text>
      </View>

      {products.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2 px-6"
          contentContainerStyle={{ gap: 8 }}
        >
          {products.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => resetConversation(p.id)}
              className={`rounded-xl border px-3 py-2 ${
                p.id === selectedId ? "border-brand-500 bg-brand-500" : "border-cream-300 bg-white"
              }`}
            >
              <Text className={`text-xs ${p.id === selectedId ? "text-white" : "text-ink-500"}`}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {selected && (
        <View className="mx-6 mb-2 flex-row items-center gap-3 rounded-2xl border border-cream-300 bg-white p-3">
          <Text className="text-lg">🔧</Text>
          <View>
            <Text className="text-sm font-medium text-ink-700">{selected.name}</Text>
            <Text className="text-xs text-ink-300">Warranty until {selected.expiry_date}</Text>
          </View>
        </View>
      )}

      {authWarning && (
        <View className="mx-6 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Text className="text-xs text-amber-700">{authWarning}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-6"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {!started ? (
          <View className="gap-3 pb-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-300">What&apos;s the issue?</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_ISSUES.map((issue) => (
                <Pressable
                  key={issue}
                  onPress={() => handleStart(issue)}
                  className="rounded-xl border border-cream-300 bg-white px-3 py-2.5"
                >
                  <Text className="text-xs text-ink-500">{issue}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-3 pb-4">
            {messages.map((m, i) => (
              <View
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "user" ? "self-end bg-ink-700" : "self-start border border-cream-300 bg-white"
                }`}
              >
                <Text className={`text-sm leading-relaxed ${m.role === "user" ? "text-white" : "text-ink-700"}`}>
                  {m.content}
                </Text>
              </View>
            ))}
            {sending && (
              <View className="self-start rounded-2xl border border-cream-300 bg-white px-4 py-3">
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {limitReached ? (
        <View className="mx-6 mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-center text-sm font-medium text-ink-700">Message limit reached</Text>
          <Text className="mt-1 text-center text-xs text-ink-500">
            Upgrade to Pro from the Pricing screen for more AI claim messages per product.
          </Text>
        </View>
      ) : (
        <View className="flex-row items-end gap-2 px-6 pb-6 pt-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={started ? "Type your reply…" : "Or describe the issue…"}
            placeholderTextColor="#9ca3af"
            editable={!sending}
            multiline
            className="flex-1 rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-ink-700"
          />
          <Pressable
            onPress={() => (started ? handleSend() : input.trim() && handleStart(input.trim()))}
            disabled={!input.trim() || sending}
            className="items-center justify-center rounded-xl bg-ink-700 px-4 py-3 active:opacity-90 disabled:opacity-40"
          >
            <Text className="font-semibold text-white">Send</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
