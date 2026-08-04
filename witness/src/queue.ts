/**
 * Durable local evidence queue — survive offline / 2G until hashes + transcript sync,
 * then retry media when the link improves.
 */
import * as FileSystem from "expo-file-system";

export type QueueItem = {
  localId: string;
  createdAt: string;
  deviceId: string;
  stateCode: string;
  startedAt: string;
  endedAt: string;
  transcriptText: string;
  transcriptHash: string;
  audioHash: string;
  videoHash: string;
  transcriptPath: string;
  audioPath: string | null;
  videoPath: string;
  audioSource: "parallel" | "ffmpeg" | "pending";
  transcriptEngine: "stub" | "native";
  location: { latitude: number; longitude: number } | null;
  scenario?: string;
  interrupted?: boolean;
  interruptReason?: string | null;
  safetyAlertSent?: boolean;
  swarmId?: string | null;
  peerLostNotes?: string;
  /** Server fields filled after sync-lite */
  sessionId?: string;
  claimCode?: string;
  claimUrl?: string;
  verificationId?: string;
  merkleRoot?: string;
  status?: string;
  uploads: { transcript?: boolean; audio?: boolean; video?: boolean };
  lastError?: string;
  syncAttempts: number;
};

const DIR = `${FileSystem.documentDirectory}evidence-queue/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

function pathFor(localId: string) {
  return `${DIR}${localId}.json`;
}

export async function saveQueueItem(item: QueueItem): Promise<void> {
  await ensureDir();
  await FileSystem.writeAsStringAsync(pathFor(item.localId), JSON.stringify(item));
}

export async function loadQueueItem(localId: string): Promise<QueueItem | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(pathFor(localId));
    return JSON.parse(raw) as QueueItem;
  } catch {
    return null;
  }
}

export async function listQueueItems(): Promise<QueueItem[]> {
  await ensureDir();
  const names = await FileSystem.readDirectoryAsync(DIR);
  const items: QueueItem[] = [];
  for (const name of names.filter((n) => n.endsWith(".json"))) {
    try {
      const raw = await FileSystem.readAsStringAsync(`${DIR}${name}`);
      items.push(JSON.parse(raw) as QueueItem);
    } catch {
      // skip corrupt
    }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function removeQueueItem(localId: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(pathFor(localId), { idempotent: true });
  } catch {
    // ignore
  }
}

export function needsSync(item: QueueItem): boolean {
  if (!item.sessionId || !item.uploads.transcript) return true;
  if (item.audioPath && !item.uploads.audio) return true;
  if (item.videoPath && !item.uploads.video) return true;
  return false;
}
