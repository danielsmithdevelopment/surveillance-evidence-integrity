/**
 * Personal-safety alert message + sync-plan contracts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSafetyAlertMessage,
  mapsUrlFor,
  normalizePhone,
  smsDeepLink,
} from "../src/safety-message.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("safety messages", () => {
  it("builds interrupt and deadman copy with location", () => {
    const loc = { latitude: 37.7749, longitude: -122.4194 };
    const interrupt = buildSafetyAlertMessage({
      kind: "interrupt",
      scenario: "First date / online dating",
      startedAt: "2024-01-01T00:00:00.000Z",
      location: loc,
      mapsUrl: mapsUrlFor(loc),
      interruptReason: "process_death",
    });
    assert.match(interrupt, /ended unexpectedly/i);
    assert.match(interrupt, /process_death/);
    assert.match(interrupt, /37\.77490/);
    assert.match(interrupt, /maps\.google/);

    const dead = buildSafetyAlertMessage({
      kind: "deadman",
      scenario: "Marketplace / meetup with a stranger",
      localId: "local-1",
    });
    assert.match(dead, /check-in missed/i);
    assert.match(dead, /local-1/);
  });

  it("normalizes phones and builds sms links", () => {
    assert.equal(normalizePhone("(415) 555-0100"), "4155550100");
    assert.match(smsDeepLink("4155550100", "hello world"), /^sms:4155550100\?body=/);
  });
});

describe("safety wiring", () => {
  it("App and Worker expose interrupt + safety-ping paths", () => {
    const app = readFileSync(join(root, "App.tsx"), "utf8");
    assert.match(app, /dispatchSafetyAlert/);
    assert.match(app, /process_death/);
    assert.match(app, /Emergency contacts/);
    assert.match(app, /SCENARIO_LABELS/);
    const worker = readFileSync(
      join(root, "../challenge-tool/worker.js"),
      "utf8",
    );
    assert.match(worker, /handleEvidenceSafetyPing/);
    assert.match(worker, /safety-ping/);
  });
});
