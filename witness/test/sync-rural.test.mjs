/**
 * Rural sync plan + gzip size sanity (no Expo runtime / no npm install required).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { uploadPlan } from "../src/sync-plan.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("rural sync plan", () => {
  it("offline keeps everything local", () => {
    assert.deepEqual(uploadPlan("offline"), {
      syncLite: false,
      audio: false,
      video: false,
    });
  });

  it("constrained (2G) only syncs lite transcript", () => {
    assert.deepEqual(uploadPlan("constrained"), {
      syncLite: true,
      audio: false,
      video: false,
    });
  });

  it("ok link allows media", () => {
    assert.deepEqual(uploadPlan("ok"), {
      syncLite: true,
      audio: true,
      video: true,
    });
  });
});

describe("transcript gzip for 2G", () => {
  it("compresses a typical transcript well under a few KB", () => {
    const text = [
      "# Challenge the Footage — Evidence transcript",
      "startedAt: 2024-01-01T00:00:00.000Z",
      "endedAt: 2024-01-01T00:03:00.000Z",
      "engine: native",
      "",
      "Officer asked for identification without stating a reason.",
      "Driver declined to consent to a vehicle search.",
      "Backup arrived approximately two minutes later.",
    ].join("\n");
    const gz = gzipSync(Buffer.from(text, "utf8"), { level: 9 });
    assert.ok(gz.byteLength < 500, `gzip ${gz.byteLength} too large for 2G-first sync`);
    assert.ok(gz.byteLength < Buffer.byteLength(text));
  });

  it("App wires sync-lite / queue / probe", () => {
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(app, /flushQueueItem/);
    assert.match(app, /probeLink/);
    assert.match(app, /gzipTextToBase64/);
    assert.match(app, /Retry sync/);
  });
});
