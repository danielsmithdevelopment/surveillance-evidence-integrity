# Witness

Civilian encounter recording app (iOS + Android via Expo). Records video + audio, transcribes on-device, uploads **transcript → audio → video** so evidence reaches safety on a weak signal, signs with a device key, and anchors a Merkle root to Arweave via the ClawQL gateway.

Free to record. Document generation hands off to [challengethefootage.com](https://challengethefootage.com) ($9 / free for public defenders).

## Architecture

```
[Witness app]
  record video + audio
  on-device Whisper transcript
  SHA-256 artifacts
  device signature (secure store / enclave target)
       |
       | priority upload
       v
[Cloudflare Worker]  witness/worker/worker.js
  POST /api/upload-url   → R2 key + upload URL
  POST /api/anchor       → ClawQL /surveillance/witness/anchor → Arweave
  GET  /api/session/:id
  GET  /api/verify/:id   → public verification record (no auth)
       |
       v
[challengethefootage.com/?witnessSession=…]
```

## Setup

```bash
cd witness
npm install
npx expo start
```

Environment:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_WITNESS_API` | Worker base URL |

Worker secrets (`wrangler secret put` in `witness/worker`):

- `CLAWQL_GATEWAY_URL`
- `CLAWQL_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

KV bindings: `SESSIONS_KV`, `DEVICE_REGISTRY_KV` (see `witness/worker/wrangler.toml`).

## Incomplete (known)

1. **Audio extraction** — `stopAndProcess` uses a placeholder file. Wire `ffmpeg-kit-react-native` to extract AAC/WAV from the recorded video before hashing/upload.
2. **R2 presigned PUT URLs** — Worker `handleUploadUrl` returns a placeholder URL. Implement AWS4 signing for R2.
3. **Whisper** — `react-native-whisper` is listed in `package.json`; live streaming transcription is stubbed in `App.tsx`.
4. **Device keys** — SecureStore HMAC placeholder; replace with secure-enclave / Keychain-backed signing keys before production.
5. **File hashing** — `sha256File` hashes a size+head marker for MVP; replace with full-file SHA-256 before court use.

## Two-party consent

First-run screen collects a state code and shows an all-party notice for CA, CT, FL, IL, MD, MA, MI, MT, NH, PA, WA. Recording laws vary — this is not legal advice.

## Verification

Anyone with a session ID can call:

```
GET /api/verify/:sessionId
```

Compare local SHA-256 of transcript/audio/video to the returned hashes, recompute `SHA-256(transcriptHash:audioHash:videoHash)`, and confirm the Merkle root matches the Arweave transaction at `https://arweave.net/{arweaveTxId}`.
