/**
 * Evidence API integration tests via wrangler unstable_dev (Miniflare).
 * Uses ALLOW_TEST_AUTH + GENERATION_MODE=offline — no Google / ClawQL / R2.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { unstable_dev } from "wrangler";
import { evidenceMerkleRoot, sha256Hex } from "../evidence-crypto.js";

const AUTH = "Bearer test:evidence-tester:evidence@example.com";
const HASHES = {
  transcriptHash: "t".repeat(64),
  audioHash: "a".repeat(64),
  videoHash: "v".repeat(64),
};

/** @type {import("wrangler").Unstable_DevWorker} */
let worker;

before(async () => {
  worker = await unstable_dev("worker.js", {
    configPath: "wrangler.toml",
    experimental: { disableExperimentalWarning: true },
    vars: {
      ALLOW_TEST_AUTH: "true",
      GENERATION_MODE: "offline",
      TOOL_NAME: "Challenge the Footage",
    },
    // Local Miniflare only; do not hit Cloudflare.
    local: true,
    persist: false,
  });
});

after(async () => {
  await worker?.stop();
});

async function api(path, { method = "GET", headers = {}, body } = {}) {
  const res = await worker.fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

describe("evidence API (wrangler local)", () => {
  it("health reports test auth when enabled", async () => {
    const { status, json } = await api("/api/health");
    assert.equal(status, 200);
    assert.equal(json.testAuthEnabled, true);
  });

  it("secure requires auth and hashes", async () => {
    let r = await api("/api/evidence/secure", { method: "POST", body: {} });
    assert.equal(r.status, 401);

    r = await api("/api/evidence/secure", {
      method: "POST",
      headers: { Authorization: AUTH },
      body: { transcriptHash: "x" },
    });
    assert.equal(r.status, 400);
  });

  it("secure → sessions → verify round-trip", async () => {
    const expectedRoot = await evidenceMerkleRoot(
      HASHES.transcriptHash,
      HASHES.audioHash,
      HASHES.videoHash
    );

    const secured = await api("/api/evidence/secure", {
      method: "POST",
      headers: { Authorization: AUTH },
      body: {
        ...HASHES,
        transcriptText: "Officer asked for ID without reasonable suspicion.",
        source: "web",
        stateCode: "CA",
      },
    });
    assert.equal(secured.status, 200, JSON.stringify(secured.json));
    assert.ok(secured.json.sessionId?.startsWith("ev-"));
    assert.equal(secured.json.merkleRoot, expectedRoot);
    assert.equal(secured.json.status, "secured_local");

    const sessions = await api("/api/evidence/sessions", {
      headers: { Authorization: AUTH },
    });
    assert.equal(sessions.status, 200);
    assert.ok(sessions.json.sessions.some((s) => s.sessionId === secured.json.sessionId));

    const verify = await api(`/api/evidence/verify/${secured.json.sessionId}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.json.merkleRoot, expectedRoot);
    assert.equal(verify.json.claimable, false);
    assert.equal(verify.json.independentlyVerifiable, false);
  });

  it("device secure → claim → upload metadata path", async () => {
    const device = await api("/api/evidence/secure-device", {
      method: "POST",
      body: {
        deviceId: "device-test-001",
        ...HASHES,
        source: "native",
        transcriptText: "Native capture stub",
      },
    });
    assert.equal(device.status, 200, JSON.stringify(device.json));
    assert.ok(device.json.claimCode);
    assert.ok(device.json.claimUrl.includes("evidence.html?claim="));
    assert.equal(device.json.status, "secured_local");

    const badClaim = await api("/api/evidence/claim", {
      method: "POST",
      headers: { Authorization: AUTH },
      body: { sessionId: device.json.sessionId, claimCode: "deadbeef" },
    });
    assert.equal(badClaim.status, 403);

    const claimed = await api("/api/evidence/claim", {
      method: "POST",
      headers: { Authorization: AUTH },
      body: { sessionId: device.json.sessionId, claimCode: device.json.claimCode },
    });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.json));
    assert.equal(claimed.json.alreadyClaimed, undefined);

    const blob = new TextEncoder().encode("hello evidence blob");
    const sha = await sha256Hex(blob);

    const urlRes = await api("/api/evidence/upload-url", {
      method: "POST",
      headers: { Authorization: AUTH },
      body: {
        sessionId: device.json.sessionId,
        artifactType: "transcript",
        contentType: "text/plain",
        sha256: sha,
      },
    });
    assert.equal(urlRes.status, 200, JSON.stringify(urlRes.json));
    assert.ok(urlRes.json.uploadUrl.includes("/api/evidence/object/"));

    const put = await worker.fetch(urlRes.json.uploadUrl.replace(/^https?:\/\/[^/]+/, ""), {
      method: "PUT",
      headers: {
        Authorization: AUTH,
        "Content-Type": "text/plain",
        "X-Content-SHA256": sha,
      },
      body: blob,
    });
    const putBody = await put.json();
    assert.equal(put.status, 200, JSON.stringify(putBody));
    assert.equal(putBody.ok, true);
    // Without R2 binding / secrets, Worker stores metadata only.
    assert.ok(
      putBody.storage === "none" || putBody.skipped === true || putBody.bytes === blob.length
    );

    const verify = await api(`/api/evidence/verify/${device.json.sessionId}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.json.claimable, false);
    assert.ok(verify.json.objects?.transcript);
  });

  it("sync-lite accepts gzip transcript in one RTT", async () => {
    const transcriptText =
      "# Challenge the Footage — Evidence transcript\nengine: stub\n\nOfficer: license and registration.\n";
    const transcriptHash = await sha256Hex(transcriptText);
    const { gzipTextToBytes } = await import("../evidence-gzip.js");
    const gz = await gzipTextToBytes(transcriptText);
    const transcriptGzipB64 = Buffer.from(gz).toString("base64");
    assert.ok(gz.byteLength < Buffer.byteLength(transcriptText) + 64);

    const lite = await api("/api/evidence/sync-lite", {
      method: "POST",
      body: {
        deviceId: "device-2g-001",
        transcriptHash,
        audioHash: HASHES.audioHash,
        videoHash: HASHES.videoHash,
        transcriptEncoding: "gzip+base64",
        transcriptGzipB64,
        linkTier: "constrained",
        source: "native",
        stateCode: "MT",
      },
    });
    assert.equal(lite.status, 200, JSON.stringify(lite.json));
    assert.ok(lite.json.claimCode);
    assert.equal(lite.json.transcriptStored, true);
    assert.equal(lite.json.mediaPending, true);
    assert.equal(lite.json.sync, "lite");

    const verify = await api(`/api/evidence/verify/${lite.json.sessionId}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.json.objects?.transcript?.storage, "inline");
    assert.equal(verify.json.mediaPending, true);
  });
});
