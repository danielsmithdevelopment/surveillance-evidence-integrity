/**
 * Gzip round-trip for sync-lite transcripts (Workers CompressionStream).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gzipTextToBytes, gunzipBase64ToText, gunzipToText } from "../evidence-gzip.js";
import { sha256Hex } from "../evidence-crypto.js";

describe("evidence-gzip", () => {
  it("round-trips UTF-8 transcript", async () => {
    const text =
      "# Challenge the Footage — Evidence transcript\n" +
      "Officer asked for ID without reasonable suspicion near Fruitvale.\n";
    const gz = await gzipTextToBytes(text);
    assert.ok(gz.byteLength > 0);
    const back = await gunzipToText(gz);
    assert.equal(back, text);
    // Longer repetitive text should compress below raw size.
    const long = (text + "\n").repeat(20);
    const gzLong = await gzipTextToBytes(long);
    assert.ok(gzLong.byteLength < Buffer.byteLength(long));
  });

  it("base64 transport matches sha256 of plaintext", async () => {
    const text = "TRANSCRIPT_PENDING: audio authoritative.\n";
    const gz = await gzipTextToBytes(text);
    const b64 = Buffer.from(gz).toString("base64");
    const decoded = await gunzipBase64ToText(b64);
    assert.equal(decoded, text);
    assert.equal(await sha256Hex(decoded), await sha256Hex(text));
  });
});
