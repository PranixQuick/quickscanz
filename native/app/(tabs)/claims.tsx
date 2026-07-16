import { useCallback, useRef, useState, useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { apiFetch, ApiAuthError } from "../../src/lib/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getWarrantyStatus } from "../../src/lib/calculations";
import { useI18n } from "../../src/i18n";
import type { Product, ClaimMessage } from "../../src/lib/types";
import HeaderLogo from "../../src/components/HeaderLogo";

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
  const { t } = useI18n();

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
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("user_id", user.id)
        .eq("is_demo", false)
        .order("expiry_date", { ascending: true });

      if (!error) {
        const list = (data as Product[] | null) ?? [];
        setProducts(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      }
    } catch (err) {
      // safe fallback
    } finally {
      setLoadingProducts(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selected = products.find((p) => p.id === selectedId) ?? null;

  const quickIssues = useMemo(() => {
    return [
      t("claim.issue_stopped_working") === "claim.issue_stopped_working" ? "Product stopped working" : t("claim.issue_stopped_working"),
      t("claim.issue_display") === "claim.issue_display" ? "Screen / display problem" : t("claim.issue_display"),
      t("claim.issue_battery") === "claim.issue_battery" ? "Battery drains too fast" : t("claim.issue_battery"),
      t("claim.issue_damage") === "claim.issue_damage" ? "Physical damage" : t("claim.issue_damage"),
      t("claim.issue_cooling") === "claim.issue_cooling" ? "Not cooling / heating" : t("claim.issue_cooling"),
      t("claim.issue_noise") === "claim.issue_noise" ? "Noise or vibration" : t("claim.issue_noise"),
      t("claim.issue_software") === "claim.issue_software" ? "Software / connectivity issue" : t("claim.issue_software"),
      t("claim.issue_parts") === "claim.issue_parts" ? "Parts missing or broken" : t("claim.issue_parts"),
    ];
  }, [t]);

  const pageTitle = useMemo(() => {
    const val = t("nav.claim");
    return val === "nav.claim" ? "Claim AI" : val;
  }, [t]);

  const pageSubtitle = useMemo(() => {
    const val = t("claim.page_subtitle");
    return val === "claim.page_subtitle" ? "Get guided through your warranty claim, step by step." : val;
  }, [t]);

  const addFirstTitle = useMemo(() => {
    const val = t("claim.add_first_title");
    return val === "claim.add_first_title" ? "Add a product first" : val;
  }, [t]);

  const addFirstDesc = useMemo(() => {
    const val = t("claim.add_first_desc");
    return val === "claim.add_first_desc"
      ? "Claim AI guides you through warranty claims for your products. Add your first real product to get started."
      : val;
  }, [t]);

  const addButtonText = useMemo(() => {
    const val = t("dashboard.add_first_product");
    return val === "dashboard.add_first_product" ? "Add a product" : val;
  }, [t]);

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
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-cream-50 px-8 py-12">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 mb-2">
          <Ionicons name="sparkles-outline" size={24} color="#786e62" />
        </View>
        <Text className="text-sm font-semibold text-ink-900 text-center">{addFirstTitle}</Text>
        <Text className="text-xs text-ink-400 text-center leading-5 px-4">
          {addFirstDesc}
        </Text>
        <Pressable
          onPress={() => router.push("/product/add")}
          className="bg-ink-900 rounded-xl px-6 py-3 active:bg-ink-800"
        >
          <Text className="text-xs font-semibold text-cream-50">{addButtonText}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-12 border-b border-cream-200 bg-cream-50 mb-4">
        <View>
          <HeaderLogo title={pageTitle} />
          <Text className="mt-1 text-xs text-ink-400 leading-4">{pageSubtitle}</Text>
        </View>
      </View>

      {products.length > 1 && (
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-6"
            contentContainerStyle={{ gap: 8 }}
          >
            {products.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => resetConversation(p.id)}
                className={`rounded-xl border px-3 py-2 ${
                  p.id === selectedId ? "border-ink-900 bg-ink-900" : "border-cream-200 bg-white"
                }`}
              >
                <Text className={`text-xs ${p.id === selectedId ? "text-cream-50 font-semibold" : "text-ink-500"}`}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {selected && (
        <View className="mx-6 mb-4 flex-row items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
          <Text className="text-lg">🔧</Text>
          <View>
            <Text className="text-sm font-semibold text-ink-700">{selected.name}</Text>
            <Text className="text-xs text-ink-400 mt-0.5">{t("product.warranty_until") || "Warranty until"} {selected.expiry_date}</Text>
          </View>
        </View>
      )}

      {authWarning && (
        <View className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Text className="text-[11px] text-amber-700 leading-4">{authWarning}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-6"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {!started ? (
          <View className="gap-3 pb-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-300">
              {t("claim.issue_prompt") || "What's the issue?"}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {quickIssues.map((issue) => (
                <Pressable
                  key={issue}
                  onPress={() => handleStart(issue)}
                  className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 active:bg-cream-100"
                >
                  <Text className="text-xs text-ink-700">{issue}</Text>
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
                  m.role === "user" ? "self-end bg-ink-900" : "self-start border border-cream-200 bg-white"
                }`}
              >
                <Text className={`text-sm leading-relaxed ${m.role === "user" ? "text-cream-50" : "text-ink-800"}`}>
                  {m.content}
                </Text>
              </View>
            ))}
            {sending && (
              <View className="self-start rounded-2xl border border-cream-200 bg-white px-4 py-3">
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {limitReached ? (
        <View className="mx-6 mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-center text-sm font-semibold text-ink-700">
            {t("claim.limit_reached_title") || "Message limit reached"}
          </Text>
          <Text className="mt-1 text-center text-xs text-ink-500 leading-4">
            {t("claim.limit_reached_desc") || "Upgrade to Pro from the Pricing screen for more AI claim messages."}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-end gap-2 px-6 pb-6 pt-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              started
                ? t("claim.reply_placeholder") || "Type your reply..."
                : t("claim.input_placeholder") || "Or describe the issue..."
            }
            placeholderTextColor="#9ca3af"
            editable={!sending}
            multiline
            className="flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-ink-900 text-sm"
          />
          <Pressable
            onPress={() => (started ? handleSend() : input.trim() && handleStart(input.trim()))}
            disabled={!input.trim() || sending}
            className="items-center justify-center rounded-xl bg-ink-900 px-5 py-3 active:bg-ink-800 disabled:opacity-40"
          >
            <Text className="font-semibold text-cream-50 text-sm">{t("common.send") || "Send"}</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
