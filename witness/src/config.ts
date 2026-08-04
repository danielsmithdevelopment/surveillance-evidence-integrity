/** Challenge the Footage — native Evidence companion config */

export const CTF_WEB = process.env.EXPO_PUBLIC_CTF_WEB || "https://challengethefootage.com";

/** Prefer the CTF Worker (same origin as the website). Legacy witness worker is deprecated. */
export const CTF_API =
  process.env.EXPO_PUBLIC_CTF_API ||
  process.env.EXPO_PUBLIC_WITNESS_API ||
  "https://challengethefootage.com";
