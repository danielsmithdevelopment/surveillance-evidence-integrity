/**
 * Evidence swarm helpers (multi-device / multi-angle incident rooms).
 */

const SWARM_TTL = 60 * 60 * 24 * 7; // 7 days
const PEER_LOST_MS = 15_000;

export function swarmKvKey(swarmId) {
  return `swarm:${swarmId}`;
}

export function randomSwarmCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function emptySwarm({ swarmId, hostDeviceId, label }) {
  const now = new Date().toISOString();
  return {
    swarmId,
    createdAt: now,
    hostDeviceId,
    status: "open", // open | recording | closed
    signal: { type: "idle", at: now, byDeviceId: hostDeviceId },
    members: {
      [hostDeviceId]: {
        deviceId: hostDeviceId,
        label: label || "Host",
        joinedAt: now,
        lastBeatAt: now,
        recording: false,
        sessionId: null,
        peerLostAnnounced: false,
      },
    },
    peerEvents: [
      {
        at: now,
        type: "CREATED",
        deviceId: hostDeviceId,
        detail: "Swarm created",
      },
    ],
  };
}

/** Mark peers silent too long as lost; append PEER_LOST once per gap. */
export function applyPeerTimeouts(swarm, nowMs = Date.now()) {
  const events = [];
  for (const m of Object.values(swarm.members || {})) {
    const last = Date.parse(m.lastBeatAt || m.joinedAt || swarm.createdAt);
    const silent = Number.isFinite(last) && nowMs - last > PEER_LOST_MS;
    if (silent && m.recording && !m.peerLostAnnounced) {
      m.peerLostAnnounced = true;
      m.recording = false;
      const ev = {
        at: new Date(nowMs).toISOString(),
        type: "PEER_LOST",
        deviceId: m.deviceId,
        detail: `No heartbeat for >${PEER_LOST_MS / 1000}s while recording`,
      };
      swarm.peerEvents = [...(swarm.peerEvents || []), ev].slice(-100);
      events.push(ev);
    }
  }
  return events;
}

export function publicSwarmView(swarm) {
  const members = Object.values(swarm.members || {}).map((m) => ({
    deviceId: m.deviceId,
    label: m.label,
    joinedAt: m.joinedAt,
    lastBeatAt: m.lastBeatAt,
    recording: !!m.recording,
    sessionId: m.sessionId || null,
    stale: Date.now() - Date.parse(m.lastBeatAt || m.joinedAt || swarm.createdAt) > PEER_LOST_MS,
  }));
  return {
    swarmId: swarm.swarmId,
    status: swarm.status,
    hostDeviceId: swarm.hostDeviceId,
    signal: swarm.signal,
    members,
    peerEvents: (swarm.peerEvents || []).slice(-30),
    createdAt: swarm.createdAt,
  };
}

export { SWARM_TTL, PEER_LOST_MS };
