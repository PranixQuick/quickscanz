import { useCallback, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { aariaSpeak, aariaUnderstand, AariaClientError } from "./aariaClient";
import type { Locale } from "../../lib/locale";

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
export function useAariaSpeech(locale: Locale) {
  const [state, setState] = useState<AariaSpeechState>({ speaking: false, error: null });
  const soundRef = useRef<Audio.Sound | null>(null);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setState({ speaking: true, error: null });
      try {
        const res = await aariaSpeak(text, { lang: locale });
        await stop();

        const fileUri = `${FileSystem.cacheDirectory}aaria-speak-${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, res.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setState((s) => ({ ...s, speaking: false }));
          }
        });
      } catch (e) {
        const message =
          e instanceof AariaClientError ? e.message : e instanceof Error ? e.message : "Could not reach Aaria";
        setState({ speaking: false, error: message });
      }
    },
    [locale, stop]
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
