import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { calculateExpiryDate } from "../../src/lib/calculations";
import type { ProductFormValues } from "../../src/lib/types";
import { useI18n } from "../../src/i18n";

const EMPTY: ProductFormValues = {
  name: "",
  brand: "",
  purchase_date: "",
  warranty_months: "12",
  price: "",
  category: "",
  model_number: "",
  serial_number: "",
  store_name: "",
  notes: "",
};

// scan.tsx pushes here with ?prefill=<JSON of Partial<ProductFormValues>> after
// a successful OCR call, so the user can review/edit before saving.
function parsePrefill(raw: string | string[] | undefined): Partial<ProductFormValues> {
  if (!raw || Array.isArray(raw)) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  required?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-xs font-medium text-ink-500">
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? "default"}
        className="rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-ink-700"
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

export default function AddProductScreen() {
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({ ...EMPTY, ...parsePrefill(prefill) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProductFormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSave() {
    if (!user) {
      Alert.alert(t("product.error_not_signed_in") || "Not signed in", t("product.error_sign_in_again") || "Please sign in again.");
      return;
    }
    if (!values.name.trim() || !values.brand.trim() || !values.purchase_date.trim()) {
      Alert.alert(t("product.error_missing_info") || "Missing info", t("product.error_missing_info_desc") || "Name, brand, and purchase date are required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.purchase_date.trim())) {
      Alert.alert(t("product.error_invalid_date") || "Invalid date", t("product.error_invalid_date_desc") || "Purchase date must be in yyyy-mm-dd format.");
      return;
    }

    const warrantyMonths = parseInt(values.warranty_months, 10) || 0;
    setSaving(true);
    setError("");
    try {
      const expiry_date = calculateExpiryDate(values.purchase_date.trim(), warrantyMonths);
      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          name: values.name.trim(),
          brand: values.brand.trim(),
          purchase_date: values.purchase_date.trim(),
          warranty_months: warrantyMonths,
          expiry_date,
          price: values.price ? Number(values.price) : null,
          category: values.category.trim() || null,
          model_number: values.model_number.trim() || null,
          serial_number: values.serial_number.trim() || null,
          store_name: values.store_name.trim() || null,
          notes: values.notes.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      router.replace(`/product/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-cream-100" contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
      <Text className="mb-6 text-2xl font-bold text-ink-700">{t("product.add_title") || "Add Product"}</Text>

      <Field label={t("product.add_name") || "Name"} required value={values.name} onChangeText={(v) => set("name", v)} placeholder="e.g. Samsung Galaxy S23" />
      <Field label={t("product.add_brand") || "Brand"} required value={values.brand} onChangeText={(v) => set("brand", v)} placeholder="e.g. Samsung" />
      <Field
        label={t("product.add_purchase_date_format") || "Purchase date (yyyy-mm-dd)"}
        required
        value={values.purchase_date}
        onChangeText={(v) => set("purchase_date", v)}
        placeholder="2026-01-15"
      />
      <Field
        label={t("product.add_warranty_format") || "Warranty (months)"}
        value={values.warranty_months}
        onChangeText={(v) => set("warranty_months", v)}
        keyboardType="numeric"
      />
      <Field label={t("product.add_price_format") || "Price (INR)"} value={values.price} onChangeText={(v) => set("price", v)} keyboardType="decimal-pad" />
      <Field label={t("product.category") || "Category"} value={values.category} onChangeText={(v) => set("category", v)} />
      <Field label={t("product.model_number") || "Model number"} value={values.model_number} onChangeText={(v) => set("model_number", v)} />
      <Field label={t("product.serial_number") || "Serial number"} value={values.serial_number} onChangeText={(v) => set("serial_number", v)} />
      <Field label={t("product.store") || "Store"} value={values.store_name} onChangeText={(v) => set("store_name", v)} />
      <Field label={t("product.notes") || "Notes"} value={values.notes} onChangeText={(v) => set("notes", v)} />

      {error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        className="items-center rounded-2xl bg-brand-500 py-3.5 active:opacity-90 disabled:opacity-50"
      >
        {saving ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{t("product.save_btn") || "Save product"}</Text>}
      </Pressable>
    </ScrollView>
  );
}
