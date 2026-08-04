import * as FileSystem from "expo-file-system";
import { CTF_API } from "./config";

export async function secureDeviceEvidence(body: Record<string, unknown>) {
  const res = await fetch(`${CTF_API}/api/evidence/secure-device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data as {
    sessionId: string;
    status: string;
    claimCode: string;
    claimUrl: string;
    verificationId: string;
    merkleRoot?: string;
  };
}

/** Upload a local file as raw bytes via expo-file-system (streaming-friendly). */
export async function uploadEvidenceObject(opts: {
  sessionId: string;
  artifactType: "transcript" | "audio" | "video";
  fileUri: string;
  contentType: string;
  sha256: string;
  deviceId: string;
  claimCode: string;
}) {
  const resMeta = await fetch(`${CTF_API}/api/evidence/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      artifactType: opts.artifactType,
      contentType: opts.contentType,
      sha256: opts.sha256,
      deviceId: opts.deviceId,
      claimCode: opts.claimCode,
    }),
  });
  const meta = await resMeta.json().catch(() => ({}));
  if (!resMeta.ok)
    throw new Error(meta.error || meta.message || resMeta.statusText);

  const uploadUrl: string = meta.uploadUrl;
  const result = await FileSystem.uploadAsync(uploadUrl, opts.fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": opts.contentType,
      "X-Content-SHA256": opts.sha256,
      "X-Device-Id": opts.deviceId,
      "X-Claim-Code": opts.claimCode,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Upload ${opts.artifactType} failed (${result.status}): ${result.body?.slice?.(0, 200) || ""}`,
    );
  }
  try {
    return JSON.parse(result.body) as { ok?: boolean; key?: string };
  } catch {
    return { ok: true, key: meta.key as string | undefined };
  }
}
