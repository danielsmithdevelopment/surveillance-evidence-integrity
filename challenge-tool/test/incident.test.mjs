/**
 * Incident helpers (no Worker).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPeerTimeouts,
  emptyIncident,
  publicIncidentView,
  randomIncidentCode,
} from "../incident.js";

describe("incident helpers", () => {
  it("generates human incident codes", () => {
    const a = randomIncidentCode();
    const b = randomIncidentCode();
    assert.match(a, /^[A-Z2-9]{6}$/);
    assert.notEqual(a, b);
  });

  it("creates host member and emits PEER_LOST after silence while recording", () => {
    const incident = emptyIncident({
      incidentId: "ABC123",
      hostDeviceId: "dev-1",
      label: "Host",
    });
    incident.members["dev-1"].recording = true;
    incident.members["dev-1"].lastBeatAt = new Date(Date.now() - 20_000).toISOString();
    const lost = applyPeerTimeouts(incident, Date.now());
    assert.equal(lost.length, 1);
    assert.equal(lost[0].type, "PEER_LOST");
    assert.equal(incident.members["dev-1"].peerLostAnnounced, true);
    // Second apply should not duplicate
    assert.equal(applyPeerTimeouts(incident, Date.now()).length, 0);
    const view = publicIncidentView(incident);
    assert.equal(view.incidentId, "ABC123");
    assert.ok(view.members[0].stale);
  });
});
