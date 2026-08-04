/**
 * Pure transcript packaging (shared by Expo app + node:test).
 */

/** @typedef {"stub" | "native"} WhisperEngineId */

/**
 * @param {WhisperEngineId} engine
 */
export function liveTranscriptBanner(engine) {
  if (engine === "native") {
    return "[Transcript] Listening… (on-device Whisper)\n";
  }
  return "[Transcript] On-device Whisper is not linked in this build. Speak normally — audio is still hashed and uploaded. Install a Whisper native module + set EXPO_PUBLIC_WHISPER=1 for live text.\n";
}

/**
 * @param {{
 *   startedAt: string,
 *   endedAt: string,
 *   engine: WhisperEngineId,
 *   modelText?: string,
 *   manualNotes?: string,
 * }} input
 */
export function formatEvidenceTranscript(input) {
  const notes = (input.manualNotes || "").trim();
  const model = (input.modelText || "").trim();
  const header = [
    `# Challenge the Footage — Evidence transcript`,
    `startedAt: ${input.startedAt}`,
    `endedAt: ${input.endedAt}`,
    `engine: ${input.engine}`,
  ].join("\n");

  if (model) {
    return `${header}\n\n${model}${notes ? `\n\n## Operator notes\n${notes}` : ""}\n`;
  }

  return [
    header,
    "",
    "TRANSCRIPT_PENDING: on-device speech-to-text was not available for this recording.",
    "Audio and video hashes remain authoritative; do not treat this file as a verbatim record of speech.",
    notes ? `\n## Operator notes\n${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trimEnd()
    .concat("\n");
}
