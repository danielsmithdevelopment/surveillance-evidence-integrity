/**
 * Build a durable queue item from whatever media we have (including interrupted sessions).
 */
import * as FileSystem from "expo-file-system";
import { sha256File, sha256Text } from "./hash";
import { formatEvidenceTranscript } from "./whisper-format.js";
import type { QueueItem } from "./queue";
import type { WhisperEngineId } from "./whisper";

export async function buildQueuePackage(input: {
  localId: string;
  deviceId: string;
  stateCode: string;
  startedAt: string;
  endedAt: string;
  engine: WhisperEngineId;
  modelText: string;
  manualNotes?: string;
  audioUri: string | null;
  videoUri: string | null;
  audioSource: "parallel" | "ffmpeg" | "pending";
  location: { latitude: number; longitude: number } | null;
  scenario?: string;
  interrupted?: boolean;
  interruptReason?: string | null;
  swarmId?: string | null;
  peerLostNotes?: string;
}): Promise<{ queueItem: QueueItem; transcriptText: string }> {
  let notes = (input.manualNotes || "").trim();
  if (input.peerLostNotes) {
    notes = notes ? `${notes}\n${input.peerLostNotes}` : input.peerLostNotes;
  }
  if (input.swarmId) {
    notes = notes
      ? `${notes}\n[swarmId: ${input.swarmId}]`
      : `[swarmId: ${input.swarmId}]`;
  }
  if (input.interrupted) {
    const tag = `[INTERRUPTED${input.interruptReason ? `: ${input.interruptReason}` : ""}]`;
    notes = notes ? `${tag}\n${notes}` : tag;
  }

  const transcriptText = formatEvidenceTranscript({
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    engine: input.engine,
    modelText: input.modelText,
    manualNotes: notes,
  });

  const transcriptPath = `${FileSystem.cacheDirectory}transcript-${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(transcriptPath, transcriptText);
  const transcriptHash = await sha256Text(transcriptText);

  let videoHash: string;
  let videoPath = input.videoUri || "";
  if (input.videoUri) {
    videoHash = await sha256File(input.videoUri);
  } else {
    videoHash = await sha256Text(
      `VIDEO_PENDING:${input.startedAt}:${input.interrupted ? "interrupted" : "missing"}`,
    );
  }

  let audioHash: string;
  let audioSource = input.audioSource;
  if (input.audioUri) {
    audioHash = await sha256File(input.audioUri);
  } else {
    audioHash = await sha256Text(`AUDIO_PENDING:${videoHash}`);
    audioSource = "pending";
  }

  const queueItem: QueueItem = {
    localId: input.localId,
    createdAt: new Date().toISOString(),
    deviceId: input.deviceId,
    stateCode: input.stateCode,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    transcriptText,
    transcriptHash,
    audioHash,
    videoHash,
    transcriptPath,
    audioPath: input.audioUri,
    videoPath,
    audioSource,
    transcriptEngine: input.engine,
    location: input.location,
    scenario: input.scenario,
    interrupted: !!input.interrupted,
    interruptReason: input.interruptReason || null,
    swarmId: input.swarmId || null,
    peerLostNotes: input.peerLostNotes || undefined,
    uploads: {},
    syncAttempts: 0,
  };

  return { queueItem, transcriptText };
}
