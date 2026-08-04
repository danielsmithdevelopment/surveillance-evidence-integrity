/**
 * Pure helpers for safety alert copy (shared by app + tests).
 */

/**
 * @param {{
 *   kind: "deadman" | "interrupt" | "manual" | "checkin_ok",
 *   scenario?: string,
 *   startedAt?: string,
 *   location?: { latitude: number, longitude: number } | null,
 *   mapsUrl?: string | null,
 *   claimUrl?: string | null,
 *   localId?: string | null,
 *   interruptReason?: string | null,
 * }} input
 */
export function buildSafetyAlertMessage(input) {
  const scenario = input.scenario || "personal safety";
  const lines = [];

  if (input.kind === "deadman") {
    lines.push(
      `Challenge the Footage safety check-in missed (${scenario}). They asked me to contact you if they did not check in.`,
    );
  } else if (input.kind === "interrupt") {
    lines.push(
      `Challenge the Footage recording ended unexpectedly (${scenario}).`,
    );
    if (input.interruptReason) lines.push(`Reason: ${input.interruptReason}`);
  } else if (input.kind === "checkin_ok") {
    lines.push(`Challenge the Footage: check-in OK (${scenario}).`);
  } else {
    lines.push(`Challenge the Footage safety alert (${scenario}).`);
  }

  if (input.startedAt) lines.push(`Started: ${input.startedAt}`);
  if (input.location) {
    lines.push(
      `Last location: ${input.location.latitude.toFixed(5)}, ${input.location.longitude.toFixed(5)}`,
    );
  }
  if (input.mapsUrl) lines.push(`Map: ${input.mapsUrl}`);
  if (input.claimUrl) lines.push(`Evidence link: ${input.claimUrl}`);
  else if (input.localId) lines.push(`Local package: ${input.localId} (not synced yet)`);

  lines.push("This is an automated safety message from their phone.");
  return lines.join("\n");
}

/**
 * @param {{ latitude: number, longitude: number }} loc
 */
export function mapsUrlFor(loc) {
  return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
}

/** @param {string} phone */
export function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

/**
 * SMS deep link (user confirms send in the Messages app).
 * @param {string} phone
 * @param {string} body
 */
export function smsDeepLink(phone, body) {
  const n = normalizePhone(phone);
  const encoded = encodeURIComponent(body);
  return `sms:${n}?body=${encoded}`;
}
