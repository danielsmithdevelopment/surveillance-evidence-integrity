/**
 * Multi-device incident client (multi-angle / multi-mic rooms).
 */
import { CTF_API } from "./config";

export type IncidentSignal = {
  type: "idle" | "start" | "stop";
  at: string;
  byDeviceId: string;
};

export type IncidentMember = {
  deviceId: string;
  label: string;
  joinedAt: string;
  lastBeatAt: string;
  recording: boolean;
  sessionId: string | null;
  stale?: boolean;
};

export type IncidentPeerEvent = {
  at: string;
  type: string;
  deviceId: string;
  detail?: string;
};

export type IncidentView = {
  incidentId: string;
  status: string;
  hostDeviceId: string;
  signal: IncidentSignal;
  members: IncidentMember[];
  peerEvents: IncidentPeerEvent[];
  createdAt: string;
  newPeerLost?: IncidentPeerEvent[];
  joinUrl?: string;
};

async function post(path: string, body: Record<string, unknown>): Promise<IncidentView> {
  const res = await fetch(`${CTF_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data as IncidentView;
}

export async function createIncident(deviceId: string, label?: string) {
  return post("/api/evidence/incident/create", { deviceId, label });
}

export async function joinIncident(incidentId: string, deviceId: string, label?: string) {
  return post("/api/evidence/incident/join", {
    incidentId: incidentId.toUpperCase(),
    deviceId,
    label,
  });
}

export async function incidentHeartbeat(input: {
  incidentId: string;
  deviceId: string;
  recording?: boolean;
  sessionId?: string;
  label?: string;
}) {
  return post("/api/evidence/incident/heartbeat", {
    incidentId: input.incidentId.toUpperCase(),
    deviceId: input.deviceId,
    recording: input.recording,
    sessionId: input.sessionId,
    label: input.label,
  });
}

export async function incidentSignal(
  incidentId: string,
  deviceId: string,
  type: "start" | "stop" | "idle",
) {
  return post("/api/evidence/incident/signal", {
    incidentId: incidentId.toUpperCase(),
    deviceId,
    type,
  });
}

export async function getIncident(incidentId: string): Promise<IncidentView> {
  const res = await fetch(
    `${CTF_API}/api/evidence/incident/${encodeURIComponent(incidentId.toUpperCase())}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data as IncidentView;
}

/** Format PEER_LOST events for transcript operator notes. */
export function formatPeerLostNotes(events: IncidentPeerEvent[]): string {
  if (!events?.length) return "";
  return events
    .filter((e) => e.type === "PEER_LOST")
    .map((e) => `[PEER_LOST ${e.at}] device=${e.deviceId} ${e.detail || ""}`.trim())
    .join("\n");
}
