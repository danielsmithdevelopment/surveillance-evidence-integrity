# Challenge the Footage — Evidence (native)

Expo / React Native companion for [challengethefootage.com](https://challengethefootage.com).

**Stack decision:** Expo/RN (not Tauri / pure Rust mobile) — see [NATIVE.md](./NATIVE.md).

## What users do

1. Pick a **situation** (police, meetup, date, night walk, …) and optional **emergency contacts**
2. **Start recording** (no Google required; works offline)
3. Optional **check-in timer** — missed check-in opens SMS drafts to contacts with last location
4. Stop (or survive a force-quit) → Whisper + hashes → local queue → 2G-first sync
5. Link to account on the website → documents / Stripe there

No crypto wallet. Not a 911 replacement — a private record + trusted-contact signal.

## Rural / poor connectivity

Designed for places where video upload is unrealistic mid-day:

| Tier | What leaves the phone |
|---|---|
| Offline | Nothing — hashes + transcript stored in `documentDirectory/evidence-queue/` |
| Constrained (slow RTT / weak cell) | Gzip transcript + three hashes (`sync-lite`) |
| OK | Transcript + audio + video |

Tap **Retry sync** when bars improve. Media never blocks securing the transcript.

## Audio strategy

1. **Parallel mic capture** with `expo-av` while the camera records (preferred in Expo)
2. Optional **ffmpeg-kit** extract if a native module is linked (dev client / bare)
3. If neither works, audio is marked `pending` with an honest hash marker (not a fake copy of the video hash)

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

See **[BUILD.md](./BUILD.md)** for the full Whisper + EAS flow.

```bash
npm i -g eas-cli
eas login
eas init
npm run whisper:fetch          # or rely on eas-build-pre-install
npm run eas:preview:ios
```

Profiles live in [`eas.json`](./eas.json): `development` (dev client), `preview` (internal), `production`. All set `EXPO_PUBLIC_WHISPER=1`.

## Incomplete (known)

1. ~~Whisper module scaffold~~ — stub + optional `whisper.rn`; model fetch/bundle + Wi‑Fi prep UI
2. ~~Rural 2G sync-lite~~ — gzip transcript first; media deferred
3. Run `eas init` + first signed preview (needs Expo/Apple/Google credentials)
4. Enclave / Keychain-backed device keys
5. Production R2 bucket binding + secrets on the CTF Worker
6. Background recording / shake-to-activate shortcuts

## Whisper

Default Expo Go builds stay on an **honest stub**. Custom EAS / `expo-dev-client` builds enable `whisper.rn` when `EXPO_PUBLIC_WHISPER=1`.

- **Bundled:** `npm run whisper:fetch` or automatic `eas-build-pre-install`
- **Field prep:** Ready screen → “Download speech model (Wi‑Fi, ~75MB)” → works offline afterward
- **2G sync:** only the gzip transcript + hashes leave the device until the link improves

```bash
npm test
```

## Legacy worker

`witness/worker/` is deprecated in favor of `challenge-tool/worker.js` evidence APIs.
