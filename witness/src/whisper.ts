/**
 * On-device speech-to-text for Evidence capture.
 *
 * Default: stub (honest placeholder — never invents speech).
 * Native: whisper.rn + ggml model (EAS / expo-dev-client; not Expo Go).
 *
 * Prefer realtime mic transcription while recording (saves WAV via audioOutputPath).
 * File transcription falls back to 16 kHz WAV when ffmpeg is linked.
 */

import * as FileSystem from "expo-file-system";
import {
  formatEvidenceTranscript,
  liveTranscriptBanner,
} from "./whisper-format.js";
import { asFileUrl, prepareWavForWhisper } from "./audio";
import { getCachedModelPath } from "./whisper-model";

export { formatEvidenceTranscript, liveTranscriptBanner };
export {
  downloadWhisperModel,
  getCachedModelPath,
  isWhisperModelReady,
  WHISPER_MODEL_URL,
} from "./whisper-model";

export type WhisperEngineId = "stub" | "native";

export type WhisperSegment = {
  t0: number;
  t1: number;
  text: string;
};

export type WhisperTranscribeResult = {
  engine: WhisperEngineId;
  text: string;
  segments: WhisperSegment[];
  placeholder: boolean;
};

export type RealtimeStopResult = {
  text: string;
  /** WAV path when whisper.rn wrote audioOutputPath */
  audioPath: string | null;
};

export type WhisperEngine = {
  id: WhisperEngineId;
  label: string;
  supportsRealtime: boolean;
  /**
   * Start mic realtime STT. Resolves to stop() → final text + optional WAV path.
   */
  startRealtime: (
    onPartial: (text: string) => void,
  ) => Promise<() => Promise<RealtimeStopResult>>;
  transcribeFile: (audioUri: string) => Promise<WhisperTranscribeResult>;
};

function stubEngine(reason?: string): WhisperEngine {
  return {
    id: "stub",
    label: reason || "Whisper stub (audio authoritative until model is ready)",
    supportsRealtime: false,
    async startRealtime(onPartial) {
      onPartial("");
      return async () => ({ text: "", audioPath: null });
    },
    async transcribeFile() {
      return {
        engine: "stub",
        text: "",
        segments: [],
        placeholder: true,
      };
    },
  };
}

type WhisperRnModule = {
  initWhisper: (opts: {
    filePath: string;
  }) => Promise<{
    transcribe: (
      uri: string,
      opts?: { language?: string },
    ) => {
      stop: () => Promise<void>;
      promise: Promise<{
        result?: string;
        segments?: Array<{ t0: number; t1: number; text: string }>;
      }>;
    };
    transcribeRealtime: (opts?: {
      language?: string;
      realtimeAudioSec?: number;
      audioOutputPath?: string;
    }) => Promise<{
      stop: () => Promise<void>;
      subscribe: (
        cb: (evt: {
          isCapturing: boolean;
          data?: { result?: string };
        }) => void,
      ) => void;
    }>;
    release?: () => Promise<void>;
  }>;
};

async function tryNativeEngine(): Promise<WhisperEngine | null> {
  if (process.env.EXPO_PUBLIC_WHISPER !== "1") return null;

  let mod: WhisperRnModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("whisper.rn") as WhisperRnModule;
  } catch {
    return null;
  }

  if (typeof mod.initWhisper !== "function") return null;

  const modelPath = await getCachedModelPath();
  if (!modelPath) {
    return stubEngine(
      "Whisper native linked — download the speech model on Wi‑Fi before field use",
    );
  }

  try {
    const ctx = await mod.initWhisper({ filePath: asFileUrl(modelPath) });
    return {
      id: "native",
      label: "On-device Whisper (tiny.en)",
      supportsRealtime: typeof ctx.transcribeRealtime === "function",
      async startRealtime(onPartial) {
        let latest = "";
        const audioPath = `${FileSystem.cacheDirectory}ctf-whisper-live-${Date.now()}.wav`;
        const session = await ctx.transcribeRealtime({
          language: "en",
          realtimeAudioSec: 30,
          audioOutputPath: audioPath,
        });
        session.subscribe((evt) => {
          const piece = (evt.data?.result || "").trim();
          if (piece) {
            latest = piece;
            onPartial(piece);
          }
        });
        return async () => {
          try {
            await session.stop();
          } catch {
            // ignore
          }
          const info = await FileSystem.getInfoAsync(audioPath);
          return {
            text: latest,
            audioPath: info.exists ? audioPath : null,
          };
        };
      },
      async transcribeFile(audioUri: string) {
        const wav = await prepareWavForWhisper(audioUri);
        const path = asFileUrl(wav || audioUri);
        try {
          const job = ctx.transcribe(path, { language: "en" });
          const out = await job.promise;
          const text = (out.result || "").trim();
          const segments = (out.segments || []).map((s) => ({
            t0: s.t0,
            t1: s.t1,
            text: s.text,
          }));
          return {
            engine: "native",
            text,
            segments,
            placeholder: !text,
          };
        } catch (e) {
          console.warn("Whisper file transcribe failed (need WAV?):", e);
          return {
            engine: "native",
            text: "",
            segments: [],
            placeholder: true,
          };
        }
      },
    };
  } catch (e) {
    console.warn("Whisper init failed:", e);
    return stubEngine("Whisper init failed — audio still hashed");
  }
}

let cached: Promise<WhisperEngine> | null = null;

/** Resolve once per app session. */
export function getWhisperEngine(): Promise<WhisperEngine> {
  if (!cached) {
    cached = (async () => (await tryNativeEngine()) || stubEngine())();
  }
  return cached;
}

export function resetWhisperEngineForTests() {
  cached = null;
}

export function resetWhisperEngine() {
  cached = null;
}
