# EAS + on-device Whisper builds

Custom native builds (not Expo Go) are required for `whisper.rn` and bundled ggml weights.

## One-time setup

```bash
cd witness
npm install
npm i -g eas-cli          # or npx eas-cli
eas login
eas init                  # writes real projectId into app config / EAS
cp .env.example .env      # optional local overrides
```

Replace `extra.eas.projectId` (or set `EAS_PROJECT_ID`) after `eas init`.

## Fetch Whisper model (for bundling into the binary)

```bash
npm run whisper:fetch          # ggml-tiny.en.bin (~75MB)
# WHISPER_FORCE=1 npm run whisper:fetch base.en   # optional larger model
```

This downloads into `assets/models/` (gitignored) and regenerates
`src/whisper-model.generated.js` so Metro can pack the `.bin`.

If you skip bundling, the app can still **download the model on Wi‑Fi** from the Ready screen before rural field work.

## Build profiles (`eas.json`)

| Profile | Use |
|---|---|
| `development` | Dev client + simulator; `EXPO_PUBLIC_WHISPER=1` |
| `preview` | Internal TestFlight / APK; Whisper on |
| `production` | Store; Whisper on |

```bash
# after whisper:fetch (recommended for offline-first rural installs)
npm run eas:preview:ios
npm run eas:preview:android
```

Install the preview build on a device, open **Download speech model** once on Wi‑Fi if the weight was not bundled, then go offline and record.

## Field behavior (recap)

1. On-device Whisper → transcript text
2. Full-file SHA-256 of transcript / audio / video
3. Weak link → gzip transcript via `POST /api/evidence/sync-lite`
4. Better link → audio / video

## Local native run (optional)

```bash
export EXPO_PUBLIC_WHISPER=1
npm run whisper:fetch
npx expo prebuild
npx expo run:ios
```

Expo Go cannot load `whisper.rn`; use a development client or EAS preview.
