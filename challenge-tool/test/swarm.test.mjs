/**
 * Swarm helpers (no Worker).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyPeerTimeouts, emptySwarm, publicSwarmView, randomSwarmCode } from "../swarm.js";

describe("swarm helpers", () => {
  it("generates human swarm codes", () => {
    const a = randomSwarmCode();
    const b = randomSwarmCode();
    assert.match(a, /^[A-Z2-9]{6}$/);
    assert.notEqual(a, b);
  });

  it("creates host member and emits PEER_LOST after silence while recording", () => {
    const swarm = emptySwarm({
      swarmId: "ABC123",
      hostDeviceId: "dev-1",
      label: "Host",
    });
    swarm.members["dev-1"].recording = true;
    swarm.members["dev-1"].lastBeatAt = new Date(Date.now() - 20_000).toISOString();
    const lost = applyPeerTimeouts(swarm, Date.now());
    assert.equal(lost.length, 1);
    assert.equal(lost[0].type, "PEER_LOST");
    assert.equal(swarm.members["dev-1"].peerLostAnnounced, true);
    // Second apply should not duplicate
    assert.equal(applyPeerTimeouts(swarm, Date.now()).length, 0);
    const view = publicSwarmView(swarm);
    assert.equal(view.swarmId, "ABC123");
    assert.ok(view.members[0].stale);
  });
});
