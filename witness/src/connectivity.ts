/**
 * Link quality probe for rural / 2G-aware sync.
 * Prefer sending a gzip transcript over any media when constrained.
 */

import * as Network from "expo-network";
import { CTF_API } from "./config";
import { uploadPlan } from "./sync-plan.js";

export type LinkTier = "offline" | "constrained" | "ok";

export type LinkProbe = {
  tier: LinkTier;
  /** Rough RTT to CTF health, ms; null if unreachable */
  rttMs: number | null;
  networkState?: string;
  detail: string;
};

export { uploadPlan };

const CONSTRAINED_RTT_MS = 2500;
const PROBE_TIMEOUT_MS = 8000;

export async function probeLink(): Promise<LinkProbe> {
  let networkState = "unknown";
  let cellular = false;
  try {
    const state = await Network.getNetworkStateAsync();
    networkState = `${state.type || "unknown"}/${state.isInternetReachable === false ? "no-inet" : "inet"}`;
    cellular = state.type === Network.NetworkStateType.CELLULAR;
    if (state.isConnected === false || state.isInternetReachable === false) {
      return {
        tier: "offline",
        rttMs: null,
        networkState,
        detail: "No data connection",
      };
    }
  } catch {
    // expo-network unavailable — probe HTTP only.
  }

  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${CTF_API}/api/health`, {
      method: "GET",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const rttMs = Date.now() - started;
    if (!res.ok) {
      return {
        tier: "constrained",
        rttMs,
        networkState,
        detail: `Health ${res.status}`,
      };
    }
    // Cellular (incl. 2G/3G) — prefer transcript-only unless the RTT is clearly healthy.
    const threshold = cellular ? 1500 : CONSTRAINED_RTT_MS;
    if (rttMs >= threshold) {
      return {
        tier: "constrained",
        rttMs,
        networkState,
        detail: cellular
          ? `Cellular ~${rttMs}ms — gzip transcript only (media waits)`
          : `Slow link (~${rttMs}ms) — transcript-only sync`,
      };
    }
    return {
      tier: "ok",
      rttMs,
      networkState,
      detail: `Link ok (~${rttMs}ms)`,
    };
  } catch (e: any) {
    clearTimeout(timer);
    return {
      tier: "offline",
      rttMs: null,
      networkState,
      detail: e?.name === "AbortError" ? "Health probe timed out" : e?.message || "Unreachable",
    };
  }
}
