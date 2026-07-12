import { useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import type { OcrResult, ProductFormValues } from "../../src/lib/types";

// Base URL of the live Next.js API (same Supabase project as the web app).
// Set EXPO_PUBLIC_API_BASE_URL in native/.env for local/dev API targets;
// falls back to production.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://www.quickscanz.com";

function ocrToPrefill(ocr: OcrResult): Partial<ProductFormValues> {
  return {
    name: ocr.product_name ?? "",
    brand: ocr.brand ?? "",
    purchase_date: ocr.purchase_date ?? "",
    warranty_months: ocr.warranty_months != null ? String(ocr.warranty_months) : "12",
    price: ocr.price ?? "",
    model_number: ocr.model_number ?? "",
    serial_number: ocr.serial_number ?? "",
    store_name: ocr.store_name ?? "",
  };
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) {
        Alert.alert("Capture failed", "Could not read the photo. Try again.");
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        Alert.alert("Not signed in", "Please sign in again to scan a bill.");
        return;
      }

      // /api/ai/ocr normally authenticates via the Supabase SSR cookie, which
      // RN's fetch has no jar for. It has an additive Bearer-token fallback
      // (see feat/ocr-bearer-auth) — cookie auth is tried first server-side,
      // and only if that finds nobody does it check this header.
      const res = await fetch(`${API_BASE_URL}/api/ai/ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ image_base64: photo.base64, mime_type: "image/jpeg" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        Alert.alert("Scan failed", body?.error ?? `Server returned ${res.status}.`);
        return;
      }

      const json = await res.json();
      // Defensive unwrap: the route's response envelope (bare OCRResult vs.
      // e.g. { result: OCRResult }) wasn't fully confirmed against the live
      // route source — handle both shapes.
      const ocr = (json?.result ?? json?.data ?? json) as OcrResult;

      router.push({ pathname: "/product/add", params: { prefill: JSON.stringify(ocrToPrefill(ocr)) } });
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-100">
        <Text className="text-ink-500">Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-cream-100 px-8">
        <Text className="text-center text-ink-700">
          QuickScanZ needs camera access to scan bills and warranty cards.
        </Text>
        <Pressable onPress={requestPermission} className="rounded-2xl bg-brand-500 px-6 py-3">
          <Text className="font-semibold text-white">Grant camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View className="absolute bottom-10 w-full items-center">
        <Pressable
          onPress={capture}
          disabled={busy}
          className="h-16 w-16 items-center justify-center rounded-full border-4 border-brand-500 bg-white active:opacity-80 disabled:opacity-50"
        >
          {busy && <ActivityIndicator />}
        </Pressable>
        <Text className="mt-3 text-xs text-white">{busy ? "Reading bill…" : "Tap to scan a bill or warranty card"}</Text>
      </View>
    </View>
  );
}
