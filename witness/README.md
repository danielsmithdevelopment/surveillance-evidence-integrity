# Challenge the Footage — Evidence (native)

Expo / React Native companion for [challengethefootage.com](https://challengethefootage.com).

**Stack decision:** Expo/RN (not Tauri / pure Rust mobile) — see [NATIVE.md](./NATIVE.md).

## What users do

1. Open the app → consent by state → **Start recording** (no Google required)
2. Stop → app secures hashes via `POST /api/evidence/secure-device`
3. **Link to my account on the website** → sign in → claim session
4. Prepare documents / pay with Stripe on the website

No crypto wallet. ClawQL anchors independently behind the scenes.

## Develop

```bash
cd witness
npm install
# Point at local CTF worker while developing:
# export EXPO_PUBLIC_CTF_API=http://127.0.0.1:8787
# export EXPO_PUBLIC_CTF_WEB=http://127.0.0.1:8787
npx expo start
```

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_CTF_API` | CTF Worker base (default production site) |
| `EXPO_PUBLIC_CTF_WEB` | Website base for claim / docs deep links |
| `EXPO_PUBLIC_WITNESS_API` | Legacy alias for `EXPO_PUBLIC_CTF_API` |

## Incomplete (known)

1. ffmpeg audio extraction from video
2. Full-file SHA-256 (MVP uses size+head marker)
3. Live Whisper transcript
4. Enclave / Keychain-backed device keys
5. R2 binary upload of full video (hashes secured first; blob upload next)
6. EAS Build / TestFlight / Play internal track

## Legacy worker

`witness/worker/` is deprecated in favor of `challenge-tool/worker.js` evidence APIs. Keep only until production cutover.
