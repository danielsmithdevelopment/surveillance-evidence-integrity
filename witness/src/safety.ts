/**
 * Emergency contacts + safety alerts for personal-safety recording.
 * Alerts prefer SMS compose (works offline to open Messages) + optional Worker ping.
 */
import * as SecureStore from "expo-secure-store";
import { Linking } from "react-native";
import { CTF_API } from "./config";
import {
  buildSafetyAlertMessage,
  mapsUrlFor,
  normalizePhone,
  smsDeepLink,
} from "./safety-message.js";

export {
  buildSafetyAlertMessage,
  mapsUrlFor,
  normalizePhone,
  smsDeepLink,
} from "./safety-message.js";

const CONTACTS_KEY = "ctf_safety_contacts_v1";
const CHECKIN_KEY = "ctf_safety_checkin_minutes_v1";
const SCENARIO_KEY = "ctf_safety_scenario_v1";
const RECORDING_FLAG = "ctf_recording_active_v1";

export type SafetyContact = { id: string; name: string; phone: string };
export type SafetyScenario =
  | "police"
  | "meetup"
  | "date"
  | "night_walk"
  | "other";

export type SafetyAlertKind = "deadman" | "interrupt" | "manual" | "checkin_ok";

export const SCENARIO_LABELS: Record<SafetyScenario, string> = {
  police: "Police / enforcement",
  meetup: "Marketplace / meetup with a stranger",
  date: "First date / online dating",
  night_walk: "Walking alone / dark area",
  other: "Other situation where I want a record",
};

export async function loadContacts(): Promise<SafetyContact[]> {
  try {
    const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: SafetyContact[]): Promise<void> {
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts.slice(0, 5)));
}

export async function loadCheckInMinutes(): Promise<number> {
  const raw = await SecureStore.getItemAsync(CHECKIN_KEY);
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n) || n < 0) return 30;
  return Math.min(180, Math.floor(n));
}

export async function saveCheckInMinutes(minutes: number): Promise<void> {
  await SecureStore.setItemAsync(CHECKIN_KEY, String(Math.max(0, Math.min(180, minutes))));
}

export async function loadScenario(): Promise<SafetyScenario> {
  const raw = (await SecureStore.getItemAsync(SCENARIO_KEY)) as SafetyScenario | null;
  if (raw && raw in SCENARIO_LABELS) return raw;
  return "other";
}

export async function saveScenario(scenario: SafetyScenario): Promise<void> {
  await SecureStore.setItemAsync(SCENARIO_KEY, scenario);
}

/** Persist that a recording is in progress — used to detect force-quit / crash. */
export async function markRecordingActive(meta: {
  localId: string;
  startedAt: string;
  scenario: SafetyScenario;
  deviceId: string;
}): Promise<void> {
  await SecureStore.setItemAsync(RECORDING_FLAG, JSON.stringify(meta));
}

export async function clearRecordingActive(): Promise<void> {
  await SecureStore.deleteItemAsync(RECORDING_FLAG);
}

export async function readRecordingActive(): Promise<{
  localId: string;
  startedAt: string;
  scenario: SafetyScenario;
  deviceId: string;
} | null> {
  try {
    const raw = await SecureStore.getItemAsync(RECORDING_FLAG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function buildMapsUrl(loc: { latitude: number; longitude: number } | null) {
  return loc ? mapsUrlFor(loc) : null;
}

/** Open the Messages app with a prefilled alert (user must tap Send). */
export async function openSmsAlerts(
  contacts: SafetyContact[],
  body: string,
): Promise<number> {
  let opened = 0;
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (!phone) continue;
    try {
      const url = smsDeepLink(phone, body);
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        opened += 1;
      }
    } catch (e) {
      console.warn("SMS open failed:", e);
    }
  }
  return opened;
}

/** Best-effort server ping (for future SMS gateway / audit log). */
export async function postSafetyPing(input: {
  deviceId: string;
  kind: SafetyAlertKind;
  message: string;
  scenario?: string;
  location?: { latitude: number; longitude: number } | null;
  sessionId?: string | null;
  localId?: string | null;
  interruptReason?: string | null;
}): Promise<{ ok: boolean; pingId?: string }> {
  try {
    const res = await fetch(`${CTF_API}/api/evidence/safety-ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: input.deviceId,
        kind: input.kind,
        message: input.message,
        scenario: input.scenario,
        location: input.location || null,
        sessionId: input.sessionId || null,
        localId: input.localId || null,
        interruptReason: input.interruptReason || null,
        at: new Date().toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false };
    return { ok: true, pingId: data.pingId };
  } catch {
    return { ok: false };
  }
}

export async function dispatchSafetyAlert(opts: {
  kind: SafetyAlertKind;
  scenario: SafetyScenario;
  deviceId: string;
  startedAt?: string;
  location?: { latitude: number; longitude: number } | null;
  claimUrl?: string | null;
  localId?: string | null;
  sessionId?: string | null;
  interruptReason?: string | null;
  openSms?: boolean;
}): Promise<{ message: string; smsOpened: number; pingOk: boolean }> {
  const contacts = await loadContacts();
  const message = buildSafetyAlertMessage({
    kind: opts.kind,
    scenario: SCENARIO_LABELS[opts.scenario] || opts.scenario,
    startedAt: opts.startedAt,
    location: opts.location,
    mapsUrl: buildMapsUrl(opts.location || null),
    claimUrl: opts.claimUrl,
    localId: opts.localId,
    interruptReason: opts.interruptReason,
  });

  const ping = await postSafetyPing({
    deviceId: opts.deviceId,
    kind: opts.kind,
    message,
    scenario: opts.scenario,
    location: opts.location,
    sessionId: opts.sessionId,
    localId: opts.localId,
    interruptReason: opts.interruptReason,
  });

  let smsOpened = 0;
  if (opts.openSms !== false && contacts.length && opts.kind !== "checkin_ok") {
    smsOpened = await openSmsAlerts(contacts, message);
  }

  return { message, smsOpened, pingOk: ping.ok };
}
