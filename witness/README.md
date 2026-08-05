# Challenge the Footage — Evidence (native)

Expo / React Native companion for [challengethefootage.com](https://challengethefootage.com).

**Stack decision:** Expo/RN (not Tauri / pure Rust mobile) — see [NATIVE.md](./NATIVE.md).

Users brand-perceive **Challenge the Footage**, not a separate crypto/Arweave app. Free to record. Document packs and Stripe live on the website.

## What users do

1. Pick a **situation** (police, meetup, date, night walk, …) and optional **emergency contacts**
2. Optional **multi-device incident** — create/join a short code so several phones start together (each keeps its own hashes/transcript; shared `incidentId`)
3. **Start recording** (no Google required; works offline) — location captured at start when permitted
4. Optional **check-in timer** — missed check-in opens SMS drafts to contacts with last location
5. Stop (or survive a force-quit) → Whisper + hashes → local queue → 2G-first sync
6. Link to account on the website → documents / Stripe there

No crypto wallet. Not a 911 replacement — a private record + trusted-contact signal.

## Rural / poor connectivity

Designed for places where video upload is unrealistic mid-day:

| Tier | What leaves the phone |
|---|---|
| Offline | Nothing — hashes + transcript stored in `documentDirectory/evidence-queue/` |
| Constrained (slow RTT / weak cell) | Gzip transcript + three hashes (`sync-lite`) |
| OK | Transcript → audio → video (priority order; each retryable) |

Tap **Retry sync** when bars improve. Media never blocks securing the transcript. If the link drops mid-upload, whatever already left the device stays secured.

## Audio + transcript honesty

1. **Parallel mic capture** with `expo-av` while the camera records (preferred in Expo)
2. Optional **ffmpeg-kit** extract if a native module is linked (dev client / bare)
3. If neither works, audio is marked `pending` with an honest hash marker (not a fake copy of the video hash)
4. On-device Whisper when linked — **audio/video bytes remain authoritative** if STT mangles words; packaging never invents speech (`TRANSCRIPT_PENDING` when Whisper is unavailable)

## Independent verification (attorneys / courts)

Anyone with a `sessionId` can call the public Worker endpoint (no wallet UX):

```
GET https://challengethefootage.com/api/evidence/verify/{sessionId}
```

Returns `transcriptHash`, `audioHash`, `videoHash`, `merkleRoot`, optional `verificationRef` (external anchor id when ClawQL has anchored), and a `howToVerify` checklist.

Integrity rule (same as the Worker):

```
merkleRoot = SHA-256(transcriptHash + ":" + audioHash + ":" + videoHash)
```

(lowercase hex). When `status` is `anchored`, confirm `verificationRef` commits to the same root. Civilian sessions and agency footage should eventually sit in the same [clawql-surveillance](https://docs.clawql.com/surveillance)-class audit world so discrepancies are detectable — phones demonstrate the bar first.

Deep-link to docs: `https://challengethefootage.com/?witnessSession={sessionId}`.

## Backend

Native talks to **`challenge-tool` Worker** evidence APIs (not a separate Witness Workers project). Production deploy: [../challenge-tool/CLOUDFLARE-DEPLOY.md](../challenge-tool/CLOUDFLARE-DEPLOY.md).

`witness/worker/` is deprecated.

## Develop

```bash
cd witness
npm install
# Point at local CTF worker while developing:
export EXPO_PUBLIC_CTF_API=http://127.0.0.1:8787
export EXPO_PUBLIC_CTF_WEB=http://127.0.0.1:8787
npx expo start
```

| Variable                  | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `EXPO_PUBLIC_CTF_API`     | CTF Worker base (default production site) |
| `EXPO_PUBLIC_CTF_WEB`     | Website base for claim / docs deep links  |
| `EXPO_PUBLIC_WITNESS_API` | Legacy alias for `EXPO_PUBLIC_CTF_API`    |

## EAS / TestFlight / Play

**New to native?** → **[FIRST-NATIVE-DEPLOY.md](./FIRST-NATIVE-DEPLOY.md)**

Also see **[BUILD.md](./BUILD.md)** for Whisper + EAS profiles.

```bash
npm i -g eas-cli
eas login
eas init
npm run whisper:fetch          # or rely on eas-build-pre-install
npm run eas:preview:ios
```

Profiles live in [`eas.json`](./eas.json): `development` (dev client), `preview` (internal), `production`. All set `EXPO_PUBLIC_WHISPER=1`.

### Voice / shortcut activation (planned)

Not shipped yet (see Incomplete). When the binary is on a phone, you can still wire OS shortcuts to **open the app** for faster start:

- **iOS:** Shortcuts → Open App → Challenge the Footage / Witness → name it “Start Witness” → add to Siri  
- **Android:** Google Assistant routines / shortcuts → Open app  

Shake-to-record and home-screen widgets are roadmap items, not current behavior.

## Incomplete (known)

1. ~~Whisper module scaffold~~ — stub + optional `whisper.rn`; model fetch/bundle + Wi‑Fi prep UI
2. ~~Rural 2G sync-lite~~ — gzip transcript first; media deferred
3. ~~Multi-device incident MVP~~ — create/join, start signal, heartbeat, `PEER_LOST`, `incidentId` on packages
4. Run `eas init` + first signed preview (needs Expo/Apple/Google credentials)
5. Attorney UI: group sessions by `incidentId` + transcript cross-reference
6. Enclave / Keychain-backed device keys (hashes + Worker anchor ship today; hardware-signed roots later)
7. Production R2 bucket binding + secrets on the CTF Worker
8. Background recording / shake-to-activate / Assistant deep-link into record
9. Server-side SMS gateway for safety-ping (today: on-device SMS drafts)

## Whisper

Default Expo Go builds stay on an **honest stub**. Custom EAS / `expo-dev-client` builds enable `whisper.rn` when `EXPO_PUBLIC_WHISPER=1`.

- **Bundled:** `npm run whisper:fetch` (default `ggml-tiny.en.bin` ~75MB) or automatic `eas-build-pre-install`
- **Field prep:** Ready screen → “Download speech model (Wi‑Fi, ~75MB)” → works offline afterward
- **2G sync:** only the gzip transcript + hashes leave the device until the link improves

```bash
npm test
```

## Legal note

Recording laws vary by state. In all-party consent states, notify the officer that you are recording. Cryptographic hashes and optional external anchoring support authenticity arguments — they are not a substitute for counsel. Documents from challengethefootage.com are attorney-review templates, not legal advice.
