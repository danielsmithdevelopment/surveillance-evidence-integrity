/**
 * Rural / 2G sync: one-shot gzip transcript + hashes.
 */
import { CTF_API } from "./config";
import { gzipTextToBase64 } from "./gzip";
import { uploadEvidenceObject } from "./api";
import type { QueueItem } from "./queue";
import { saveQueueItem } from "./queue";
import { probeLink, uploadPlan, type LinkTier } from "./connectivity";

export type SyncLiteResult = {
  sessionId: string;
  status: string;
  claimCode: string;
  claimUrl: string;
  verificationId: string;
  merkleRoot?: string;
  transcriptStored: boolean;
  compressedBytes: number;
  rawBytes: number;
};

/** Single RTT: register hashes + deliver gzip transcript (no separate upload-url). */
export async function syncLiteEvidence(input: {
  deviceId: string;
  transcriptText: string;
  transcriptHash: string;
  audioHash: string;
  videoHash: string;
  mimeType?: string;
  startedAt?: string;
  endedAt?: string;
  stateCode?: string;
  source?: string;
  location?: { latitude: number; longitude: number } | null;
  audioExtracted?: boolean;
  audioSource?: string;
  transcriptEngine?: string;
  linkTier?: LinkTier;
}): Promise<SyncLiteResult> {
  const gz = gzipTextToBase64(input.transcriptText);
  const res = await fetch(`${CTF_API}/api/evidence/sync-lite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      deviceId: input.deviceId,
      transcriptHash: input.transcriptHash,
      audioHash: input.audioHash,
      videoHash: input.videoHash,
      transcriptEncoding: "gzip+base64",
      transcriptGzipB64: gz.b64,
      mimeType: input.mimeType || "video/mp4",
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      stateCode: input.stateCode,
      source: input.source || "native",
      location: input.location || null,
      audioExtracted: input.audioExtracted,
      audioSource: input.audioSource,
      transcriptEngine: input.transcriptEngine,
      linkTier: input.linkTier || "constrained",
      sync: "lite",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return {
    sessionId: data.sessionId,
    status: data.status,
    claimCode: data.claimCode,
    claimUrl: data.claimUrl,
    verificationId: data.verificationId || data.sessionId,
    merkleRoot: data.merkleRoot,
    transcriptStored: !!data.transcriptStored,
    compressedBytes: gz.gzipBytes,
    rawBytes: gz.rawBytes,
  };
}

/**
 * Push a queued package according to current link tier.
 * Always prefers gzip transcript before any media.
 */
export async function flushQueueItem(
  item: QueueItem,
  opts?: { tier?: LinkTier },
): Promise<QueueItem> {
  const probe = opts?.tier ? { tier: opts.tier } : await probeLink();
  const plan = uploadPlan(probe.tier);
  item.syncAttempts = (item.syncAttempts || 0) + 1;
  item.lastError = undefined;

  if (!plan.syncLite) {
    item.lastError = "Offline — kept on device";
    await saveQueueItem(item);
    return item;
  }

  if (!item.sessionId || !item.uploads.transcript) {
    const lite = await syncLiteEvidence({
      deviceId: item.deviceId,
      transcriptText: item.transcriptText,
      transcriptHash: item.transcriptHash,
      audioHash: item.audioHash,
      videoHash: item.videoHash,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      stateCode: item.stateCode,
      location: item.location,
      audioExtracted: item.audioSource !== "pending",
      audioSource: item.audioSource,
      transcriptEngine: item.transcriptEngine,
      linkTier: probe.tier,
    });
    item.sessionId = lite.sessionId;
    item.claimCode = lite.claimCode;
    item.claimUrl = lite.claimUrl;
    item.verificationId = lite.verificationId;
    item.merkleRoot = lite.merkleRoot;
    item.status = lite.status;
    item.uploads.transcript = lite.transcriptStored;
    await saveQueueItem(item);
  }

  const common = {
    sessionId: item.sessionId!,
    deviceId: item.deviceId,
    claimCode: item.claimCode!,
  };

  if (plan.audio && item.audioPath && !item.uploads.audio) {
    await uploadEvidenceObject({
      ...common,
      artifactType: "audio",
      fileUri: item.audioPath,
      contentType: item.audioPath.endsWith(".wav") ? "audio/wav" : "audio/mp4",
      sha256: item.audioHash,
    });
    item.uploads.audio = true;
    await saveQueueItem(item);
  }

  if (plan.video && item.videoPath && !item.uploads.video) {
    await uploadEvidenceObject({
      ...common,
      artifactType: "video",
      fileUri: item.videoPath,
      contentType: "video/mp4",
      sha256: item.videoHash,
    });
    item.uploads.video = true;
    await saveQueueItem(item);
  }

  return item;
}
