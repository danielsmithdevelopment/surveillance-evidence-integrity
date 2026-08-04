/**
 * Incident client wiring contract (no network).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("incident native wiring", () => {
  it("App exposes create/join incident and PEER_LOST packaging", () => {
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(app, /createIncident/);
    assert.match(app, /joinIncident/);
    assert.match(app, /incidentSignal/);
    assert.match(app, /Multi-device incident/);
    assert.match(app, /peerLostNotes/);
    const pkg = readFileSync(join(root, "src/package-session.ts"), "utf8");
    assert.match(pkg, /incidentId/);
    assert.match(pkg, /peerLostNotes/);
  });
});
