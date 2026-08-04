/**
 * Gzip helpers for 2G-friendly transcript sync (fflate).
 */
import { gzipSync, gunzipSync, strToU8, strFromU8 } from "fflate";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa is available in Hermes / RN
  return globalThis.btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Gzip UTF-8 text → base64 (URL-safe transport inside JSON). */
export function gzipTextToBase64(text: string): { b64: string; rawBytes: number; gzipBytes: number } {
  const raw = strToU8(text);
  const gz = gzipSync(raw, { level: 9 });
  return { b64: bytesToBase64(gz), rawBytes: raw.length, gzipBytes: gz.length };
}

export function gunzipBase64ToText(b64: string): string {
  return strFromU8(gunzipSync(base64ToBytes(b64)));
}
