/**
 * Gzip helpers for Workers (DecompressionStream) + tests.
 */

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function gunzipToText(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream unavailable");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export async function gunzipBase64ToText(b64) {
  return gunzipToText(b64ToBytes(b64));
}

export async function gzipTextToBytes(text) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("CompressionStream unavailable");
  }
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
