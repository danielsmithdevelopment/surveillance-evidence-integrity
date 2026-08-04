/**
 * On-device speech-to-text for Evidence capture.
 *
 * Default: stub (honest placeholder — never invents speech).
 * Optional: whisper.rn (or similar) when linked in a custom Expo dev client.
 *
 * Enable experimental native path with EXPO_PUBLIC_WHISPER=1 after installing
 * a Whisper native module. See NATIVE.md / README.
 */

import {
  formatEvidenceTranscript,
  liveTranscriptBanner,
} from "./whisper-format.js";

export { formatEvidenceTranscript, liveTranscriptBanner };

export type WhisperEngineId = "stub" | "native";

export type WhisperSegment = {
  /** Start seconds */
  t0: number;
  /** End seconds */
  t1: number;
  text: string;
};

export type WhisperTranscribeResult = {
  engine: WhisperEngineId;
  text: string;
  segments: WhisperSegment[];
  /** True when text is a placeholder, not model output */
  placeholder: boolean;
};

export type WhisperEngine = {
  id: WhisperEngineId;
  /** Human-readable status for the recording UI */
  label: string;
  /**
   * Transcribe a local audio file URI after stop.
   * Stub returns an empty body with placeholder: true.
   */
  transcribeFile: (audioUri: string) => Promise<WhisperTranscribeResult>;
};

function stubEngine(): WhisperEngine {
  return {
    id: "stub",
    label: "Whisper stub (audio-only until native module linked)",
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

/**
 * Attempt to load a native Whisper binding (whisper.rn-style).
 * Returns null when unavailable — callers must fall back to stub.
 */
async function tryNativeEngine(): Promise<WhisperEngine | null> {
  if (process.env.EXPO_PUBLIC_WHISPER !== "1") return null;
  try {
    // Optional dependency — not installed in the default Expo Go build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("whisper.rn") as {
      transcribe?: (uri: string) => Promise<{ result?: string; text?: string }>;
      initWhisper?: (opts: { filePath: string }) => Promise<{
        transcribe: (
          uri: string,
        ) => Promise<{ result?: string; text?: string }>;
      }>;
    };

    if (typeof mod.transcribe === "function") {
      return {
        id: "native",
        label: "On-device Whisper",
        async transcribeFile(audioUri: string) {
          const out = await mod.transcribe!(audioUri);
          const text = (out.result || out.text || "").trim();
          return {
            engine: "native",
            text,
            segments: [],
            placeholder: !text,
          };
        },
      };
    }

    const modelPath = process.env.EXPO_PUBLIC_WHISPER_MODEL || "";
    if (typeof mod.initWhisper === "function" && modelPath) {
      const ctx = await mod.initWhisper({ filePath: modelPath });
      return {
        id: "native",
        label: "On-device Whisper",
        async transcribeFile(audioUri: string) {
          const out = await ctx.transcribe(audioUri);
          const text = (out.result || out.text || "").trim();
          return {
            engine: "native",
            text,
            segments: [],
            placeholder: !text,
          };
        },
      };
    }
  } catch {
    // Module missing or native bridge failed — stay on stub.
  }
  return null;
}

let cached: Promise<WhisperEngine> | null = null;

/** Resolve once per app session. */
export function getWhisperEngine(): Promise<WhisperEngine> {
  if (!cached) {
    cached = (async () => (await tryNativeEngine()) || stubEngine())();
  }
  return cached;
}

/** Test helper — reset memoized engine. */
export function resetWhisperEngineForTests() {
  cached = null;
}
