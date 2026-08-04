/**
 * Swarm client wiring contract (no network).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("swarm native wiring", () => {
  it("App exposes create/join swarm and PEER_LOST packaging", () => {
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(app, /createSwarm/);
    assert.match(app, /joinSwarm/);
    assert.match(app, /swarmSignal/);
    assert.match(app, /Multi-device swarm/);
    assert.match(app, /peerLostNotes/);
    const pkg = readFileSync(join(root, "src/package-session.ts"), "utf8");
    assert.match(pkg, /swarmId/);
    assert.match(pkg, /peerLostNotes/);
  });
});
