/**
 * Multi-device incident helpers (multi-angle / multi-mic rooms).
 */

const INCIDENT_TTL = 60 * 60 * 24 * 7; // 7 days
const PEER_LOST_MS = 15_000;

export function incidentKvKey(incidentId) {
  return `incident:${incidentId}`;
}

export function randomIncidentCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function emptyIncident({ incidentId, hostDeviceId, label }) {
  const now = new Date().toISOString();
  return {
    incidentId,
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
        detail: "Incident created",
      },
    ],
  };
}

/** Mark peers silent too long as lost; append PEER_LOST once per gap. */
export function applyPeerTimeouts(incident, nowMs = Date.now()) {
  const events = [];
  for (const m of Object.values(incident.members || {})) {
    const last = Date.parse(m.lastBeatAt || m.joinedAt || incident.createdAt);
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
      incident.peerEvents = [...(incident.peerEvents || []), ev].slice(-100);
      events.push(ev);
    }
  }
  return events;
}

export function publicIncidentView(incident) {
  const members = Object.values(incident.members || {}).map((m) => ({
    deviceId: m.deviceId,
    label: m.label,
    joinedAt: m.joinedAt,
    lastBeatAt: m.lastBeatAt,
    recording: !!m.recording,
    sessionId: m.sessionId || null,
    stale: Date.now() - Date.parse(m.lastBeatAt || m.joinedAt || incident.createdAt) > PEER_LOST_MS,
  }));
  return {
    incidentId: incident.incidentId,
    status: incident.status,
    hostDeviceId: incident.hostDeviceId,
    signal: incident.signal,
    members,
    peerEvents: (incident.peerEvents || []).slice(-30),
    createdAt: incident.createdAt,
  };
}

export { INCIDENT_TTL, PEER_LOST_MS };
