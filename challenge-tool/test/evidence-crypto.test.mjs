/**
 * Unit tests for shared evidence hashing (matches Worker merkle commitment).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evidenceMerkleRoot, randomClaimCode, sha256Hex } from "../evidence-crypto.js";

describe("evidence-crypto", () => {
  it("sha256Hex matches known UTF-8 digest", async () => {
    // echo -n "abc" | shasum -a 256
    assert.equal(
      await sha256Hex("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("sha256Hex accepts Uint8Array", async () => {
    const bytes = new TextEncoder().encode("abc");
    assert.equal(await sha256Hex(bytes), await sha256Hex("abc"));
  });

  it("evidenceMerkleRoot is SHA-256 of colon-joined hashes", async () => {
    const t = "aa".repeat(32);
    const a = "bb".repeat(32);
    const v = "cc".repeat(32);
    const expected = await sha256Hex(`${t}:${a}:${v}`);
    assert.equal(await evidenceMerkleRoot(t, a, v), expected);
  });

  it("randomClaimCode is 36 hex chars and unique", () => {
    const a = randomClaimCode();
    const b = randomClaimCode();
    assert.match(a, /^[0-9a-f]{36}$/);
    assert.match(b, /^[0-9a-f]{36}$/);
    assert.notEqual(a, b);
  });
});
