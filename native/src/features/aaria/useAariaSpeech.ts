import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { aariaSpeak, aariaUnderstand, AariaClientError } from "./aariaClient";
import type { Locale } from "../../lib/locale";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AariaSpeechState {
  speaking: boolean;
  error: string | null;
}

/**
 * Plays back Aaria's `/api/voice/speak` base64 audio via expo-av.
 *
 * The exact audio container/codec pranix-aaria returns isn't confirmed from
 * lib/aaria-client.ts's contract (just `audio_base64` + `lang` +
 * `engine_used`, no mime type) — assumed mp3 here as the most common TTS
 * output format. Base64 is written to a temp file via expo-file-system
 * rather than played as a `data:` URI directly: expo-av's underlying
 * players (AVPlayer on iOS, ExoPlayer on Android) have inconsistent support
 * for data URIs across SDK versions, while a `file://` URI is reliably
 * supported on both. If playback fails in device testing, the first thing
 * to check is the actual container/codec pranix-aaria returns and adjust
 * the file extension/decoding accordingly.
 */
let globalActiveSound: Audio.Sound | null = null;

export function useAariaSpeech(locale: Locale) {
  const [state, setState] = useState<AariaSpeechState>({ speaking: false, error: null });
  const soundRef = useRef<Audio.Sound | null>(null);
  const requestCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (globalActiveSound && globalActiveSound === soundRef.current) {
        globalActiveSound = null;
      }
    };
  }, []);

  const stop = useCallback(async () => {
    requestCountRef.current++; // Invalidate any running speak() calls
    if (globalActiveSound) {
      try {
        await globalActiveSound.stopAsync().catch(() => {});
        await globalActiveSound.unloadAsync().catch(() => {});
      } catch (err) {}
      globalActiveSound = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
      } catch (err) {}
      soundRef.current = null;
    }
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  const speak = useCallback(
    async (text: string) => {
      console.log("[useAariaSpeech] speak called with text:", text);
      const requestId = ++requestCountRef.current;

      // 1. Immediately stop any currently playing voice before fetching
      if (globalActiveSound) {
        try {
          await globalActiveSound.stopAsync().catch(() => {});
          await globalActiveSound.unloadAsync().catch(() => {});
        } catch (err) {}
        globalActiveSound = null;
      }
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync().catch(() => {});
          await soundRef.current.unloadAsync().catch(() => {});
        } catch (err) {}
        soundRef.current = null;
      }

      try {
        const val = await AsyncStorage.getItem("aaria_voice_enabled");
        const enabled = val === null ? true : val === "true";
        if (!enabled) {
          console.log("[useAariaSpeech] speak ignored (voice disabled)");
          setState((s) => ({ ...s, speaking: false }));
          return;
        }
      } catch {}

      setState({ speaking: true, error: null });
      try {
        const res = await aariaSpeak(text, { lang: locale, qualityTier: "premium" });
        
        // If a newer speech request has started, abort this stale one
        if (requestId !== requestCountRef.current) {
          console.log("[useAariaSpeech] Aborted stale speech request:", requestId);
          return;
        }

        // Stop again before playback to be safe
        const activeSound = globalActiveSound as any;
        if (activeSound) {
          try {
            await activeSound.stopAsync().catch(() => {});
            await activeSound.unloadAsync().catch(() => {});
          } catch (err) {}
          globalActiveSound = null;
        }
        const currentSound = soundRef.current as any;
        if (currentSound) {
          try {
            await currentSound.stopAsync().catch(() => {});
            await currentSound.unloadAsync().catch(() => {});
          } catch (err) {}
          soundRef.current = null;
        }

        const audioRef = res.audio_base64 || (res as any).audio_ref;
        if (!audioRef) {
          throw new Error("No audio content returned from Aaria");
        }

        let fileUri = "";
        if (audioRef.startsWith("http://") || audioRef.startsWith("https://")) {
          fileUri = audioRef;
        } else {
          let base64Data = "";
          if (audioRef.startsWith("data:")) {
            const commaIndex = audioRef.indexOf(",");
            if (commaIndex !== -1) {
              base64Data = audioRef.substring(commaIndex + 1);
            } else {
              base64Data = audioRef;
            }
          } else {
            base64Data = audioRef;
          }

          fileUri = `${FileSystem.cacheDirectory}aaria-speak-${Date.now()}.wav`;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Check again after filesystem write
        if (requestId !== requestCountRef.current) {
          console.log("[useAariaSpeech] Aborted stale speech request before playback:", requestId);
          return;
        }

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
        
        // If a newer speech request has started while loading the sound, unload it immediately!
        if (requestId !== requestCountRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        globalActiveSound = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            if (globalActiveSound === sound) {
              globalActiveSound = null;
            }
            setState((s) => ({ ...s, speaking: false }));
          }
        });
      } catch (e) {
        console.error("[useAariaSpeech] speak() error:", e);
        const message =
          e instanceof AariaClientError ? e.message : e instanceof Error ? e.message : "Could not reach Aaria";
        setState({ speaking: false, error: message });
      }
    },
    [locale]
  );

  /**
   * Runs the same understand -> resolve -> speak loop
   * app/api/aaria-query/route.ts runs server-side for intents like
   * `get_warranty_status`, except `resolveAnswer` resolves fully on-device
   * (e.g. against the product already loaded on the current screen) instead
   * of a server-side product search — callers decide what the answer means.
   */
  const ask = useCallback(
    async (
      text: string,
      resolveAnswer: (understood: Awaited<ReturnType<typeof aariaUnderstand>>) => string
    ): Promise<string | null> => {
      setState({ speaking: true, error: null });
      try {
        const understood = await aariaUnderstand(text, { langHint: locale });
        const answer = resolveAnswer(understood);
        await speak(answer);
        return answer;
      } catch (e) {
        console.error("[useAariaSpeech] ask() error:", e);
        const message =
          e instanceof AariaClientError ? e.message : e instanceof Error ? e.message : "Could not reach Aaria";
        setState({ speaking: false, error: message });
        return null;
      }
    },
    [locale, speak]
  );

  return { ...state, speak, ask, stop };
}
