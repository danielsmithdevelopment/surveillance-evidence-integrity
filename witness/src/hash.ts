import * as FileSystem from "expo-file-system";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { toByteArray } from "base64-js";

const CHUNK = 1024 * 1024; // 1 MiB file slices

/** Full-file SHA-256 over raw bytes (chunked). */
export async function sha256File(uri: string): Promise<string> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !("size" in info) || !info.size) {
    throw new Error(`Cannot hash missing or empty file: ${uri}`);
  }
  const size = Number(info.size);
  const hasher = sha256.create();

  for (let pos = 0; pos < size; pos += CHUNK) {
    const length = Math.min(CHUNK, size - pos);
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: pos,
      length,
    });
    hasher.update(toByteArray(b64));
  }

  return bytesToHex(hasher.digest());
}

export async function sha256Text(text: string): Promise<string> {
  const hasher = sha256.create();
  hasher.update(new TextEncoder().encode(text));
  return bytesToHex(hasher.digest());
}
