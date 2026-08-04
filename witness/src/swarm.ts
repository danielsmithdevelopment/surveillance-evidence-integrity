/**
 * Multi-device evidence swarm client (multi-angle / multi-mic incident rooms).
 */
import { CTF_API } from "./config";

export type SwarmSignal = {
  type: "idle" | "start" | "stop";
  at: string;
  byDeviceId: string;
};

export type SwarmMember = {
  deviceId: string;
  label: string;
  joinedAt: string;
  lastBeatAt: string;
  recording: boolean;
  sessionId: string | null;
  stale?: boolean;
};

export type SwarmPeerEvent = {
  at: string;
  type: string;
  deviceId: string;
  detail?: string;
};

export type SwarmView = {
  swarmId: string;
  status: string;
  hostDeviceId: string;
  signal: SwarmSignal;
  members: SwarmMember[];
  peerEvents: SwarmPeerEvent[];
  createdAt: string;
  newPeerLost?: SwarmPeerEvent[];
  joinUrl?: string;
};

async function post(path: string, body: Record<string, unknown>): Promise<SwarmView> {
  const res = await fetch(`${CTF_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data as SwarmView;
}

export async function createSwarm(deviceId: string, label?: string) {
  return post("/api/evidence/swarm/create", { deviceId, label });
}

export async function joinSwarm(swarmId: string, deviceId: string, label?: string) {
  return post("/api/evidence/swarm/join", {
    swarmId: swarmId.toUpperCase(),
    deviceId,
    label,
  });
}

export async function swarmHeartbeat(input: {
  swarmId: string;
  deviceId: string;
  recording?: boolean;
  sessionId?: string;
  label?: string;
}) {
  return post("/api/evidence/swarm/heartbeat", {
    swarmId: input.swarmId.toUpperCase(),
    deviceId: input.deviceId,
    recording: input.recording,
    sessionId: input.sessionId,
    label: input.label,
  });
}

export async function swarmSignal(
  swarmId: string,
  deviceId: string,
  type: "start" | "stop" | "idle",
) {
  return post("/api/evidence/swarm/signal", {
    swarmId: swarmId.toUpperCase(),
    deviceId,
    type,
  });
}

export async function getSwarm(swarmId: string): Promise<SwarmView> {
  const res = await fetch(
    `${CTF_API}/api/evidence/swarm/${encodeURIComponent(swarmId.toUpperCase())}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data as SwarmView;
}

/** Format PEER_LOST events for transcript operator notes. */
export function formatPeerLostNotes(events: SwarmPeerEvent[]): string {
  if (!events?.length) return "";
  return events
    .filter((e) => e.type === "PEER_LOST")
    .map((e) => `[PEER_LOST ${e.at}] device=${e.deviceId} ${e.detail || ""}`.trim())
    .join("\n");
}
