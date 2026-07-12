import { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function capture() {
    if (!cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      setLastPhotoUri(photo?.uri ?? null);
      // M2 TODO: POST { image_base64: photo.base64, mime_type: "image/jpeg" } to the
      // existing /api/ai/ocr endpoint with an `Authorization: Bearer <access_token>`
      // header (see native/README.md — that endpoint currently only reads the
      // Supabase SSR cookie, which native fetch does not have).
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
          className="h-16 w-16 rounded-full border-4 border-brand-500 bg-white active:opacity-80 disabled:opacity-50"
        />
        {lastPhotoUri && (
          <Text className="mt-3 text-xs text-white">Captured. OCR wiring lands in M2.</Text>
        )}
      </View>
    </View>
  );
}
