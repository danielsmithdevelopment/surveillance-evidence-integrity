/**
 * Transcript packaging + Whisper module contract tests (no Expo runtime).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatEvidenceTranscript,
  liveTranscriptBanner,
} from "../src/whisper-format.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("whisper-format", () => {
  it("live banner distinguishes stub vs native", () => {
    assert.match(liveTranscriptBanner("stub"), /not linked/i);
    assert.match(liveTranscriptBanner("native"), /Listening/);
  });

  it("pending transcript never invents speech", () => {
    const pending = formatEvidenceTranscript({
      startedAt: "2024-01-01T00:00:00.000Z",
      endedAt: "2024-01-01T00:01:00.000Z",
      engine: "stub",
    });
    assert.match(pending, /TRANSCRIPT_PENDING/);
    assert.match(pending, /engine: stub/);
    assert.doesNotMatch(pending, /I heard the officer/);
  });

  it("model text is packaged with optional operator notes", () => {
    const live = formatEvidenceTranscript({
      startedAt: "a",
      endedAt: "b",
      engine: "native",
      modelText: "Officer asked for identification.",
      manualNotes: "Near Fruitvale BART",
    });
    assert.match(live, /Officer asked for identification/);
    assert.match(live, /Operator notes/);
    assert.match(live, /Fruitvale/);
    assert.doesNotMatch(live, /TRANSCRIPT_PENDING/);
  });
});

describe("whisper module wiring", () => {
  it("App and whisper.ts reference the format helpers", () => {
    const whisper = readFileSync(join(root, "src/whisper.ts"), "utf8");
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(whisper, /getWhisperEngine/);
    assert.match(whisper, /EXPO_PUBLIC_WHISPER/);
    assert.match(
      app,
      /getWhisperEngine|formatEvidenceTranscript|liveTranscriptBanner/,
    );
  });
});
