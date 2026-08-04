/**
 * Upload plan by link tier (pure — shared by app + tests).
 * @param {"offline"|"constrained"|"ok"} tier
 */
export function uploadPlan(tier) {
  switch (tier) {
    case "offline":
      return { syncLite: false, audio: false, video: false };
    case "constrained":
      return { syncLite: true, audio: false, video: false };
    default:
      return { syncLite: true, audio: true, video: true };
  }
}
