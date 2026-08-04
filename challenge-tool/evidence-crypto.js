/**
 * Shared evidence hashing helpers (Worker + unit tests).
 *
 * `sha256Hex` hashes UTF-8 text (claim codes, colon-joined media hashes).
 * Native capture uses `@noble/hashes` over raw file bytes — same hex alphabet.
 * Merkle root for CTF evidence is SHA-256 of `transcript:audio:video` hex hashes.
 */

export async function sha256Hex(text) {
  const data = typeof text === "string" ? new TextEncoder().encode(text) : text;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Commitment over the three media hashes (not a multi-layer Merkle tree). */
export async function evidenceMerkleRoot(transcriptHash, audioHash, videoHash) {
  return sha256Hex(`${transcriptHash}:${audioHash}:${videoHash}`);
}

/** 36-char hex claim code (18 random bytes). */
export function randomClaimCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
