# Challenge the Footage — Evidence (native)

Expo / React Native companion for [challengethefootage.com](https://challengethefootage.com).

**Stack decision:** Expo/RN (not Tauri / pure Rust mobile) — see [NATIVE.md](./NATIVE.md).

## What users do

1. Open the app → consent by state → **Start recording** (no Google required)
2. Stop → full-file SHA-256 of transcript / audio / video → `POST /api/evidence/secure-device`
3. Upload blobs (`transcript` → `audio` → `video`) via Worker-proxied PUT → R2 when configured
4. **Link to my account on the website** → sign in → claim session
5. Prepare documents / pay with Stripe on the website

No crypto wallet. ClawQL anchors independently behind the scenes.

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

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_CTF_API` | CTF Worker base (default production site) |
| `EXPO_PUBLIC_CTF_WEB` | Website base for claim / docs deep links |
| `EXPO_PUBLIC_WITNESS_API` | Legacy alias for `EXPO_PUBLIC_CTF_API` |

## EAS / TestFlight / Play

```bash
npm i -g eas-cli   # or use local ./node_modules/.bin/eas
eas login
eas init           # writes real projectId into app.json extra.eas
eas build --profile preview --platform ios
eas submit --profile production --platform ios
```

Profiles live in [`eas.json`](./eas.json): `development` (dev client), `preview` (internal), `production`.

## Incomplete (known)

1. Live Whisper transcript
2. Enclave / Keychain-backed device keys
3. Production R2 bucket binding + secrets on the CTF Worker
4. Replace `extra.eas.projectId` placeholder after `eas init`
5. Background recording / shake-to-activate shortcuts

## Legacy worker

`witness/worker/` is deprecated in favor of `challenge-tool/worker.js` evidence APIs.
