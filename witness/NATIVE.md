# Native capture stack — decision

**Choice for Challenge the Footage Evidence (mobile): Expo / React Native** (`witness/`).

## Why not Tauri / “Rust mobile”?

| Option                             | Fit for police-encounter recording                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Expo / React Native**            | Strong camera/mic/permissions, App Store + Play path, already scaffolded here. Best near-term.               |
| **Tauri 2 mobile**                 | Real, but early for production camera capture; stronger on desktop shells than iOS/Android media apps today. |
| **Pure Rust (JNI / Swift bridge)** | Maximum control, maximum cost. Revisit only if RN cannot meet integrity/enclave requirements.                |
| **Flutter**                        | Fine technically; would discard the existing Expo app for little gain.                                       |

We can still use **Rust where it matters later** (hashing, signing) via a native module — without rewriting the whole UX in Rust.

## Product role

- **Website** (`challengethefootage.com`) — account, Stripe, docs, web record, evidence library
- **Native app** (`witness/`) — one-tap capture when the browser is not enough (background, offline, faster cold start)

Users brand-perceive **Challenge the Footage**, not a separate crypto/Arweave app.

## Capture UX rule

**Record first, account later.** Mid-encounter must not require Google sign-in.

Works for **police encounters and broader personal safety** (meetups, dates, night walks):

1. Native records → **on-device Whisper** (offline) → hashes → durable local queue
2. Force-quit / unexpected stop → interrupted package + emergency-contact alerts
3. Probe link: **offline** keep local · **constrained/2G** `sync-lite` · **ok** media too
4. User claims on the website when ready
5. ClawQL anchors behind the scenes; Stripe only for document packs

## Near-term build order

1. ~~Point native at CTF Worker evidence APIs~~
2. ~~Device-first secure + claim on website~~
3. ~~Full-file SHA-256 + parallel audio (ffmpeg optional)~~
4. ~~R2 upload via Worker-proxied PUT~~
5. ~~Whisper module scaffold (stub + optional whisper.rn)~~
6. ~~Rural / 2G sync-lite (gzip transcript first, media later)~~
7. ~~EAS + Whisper model fetch/bundle (`BUILD.md`, `eas-build-pre-install`)~~
8. ~~Interrupt recovery + emergency contacts / check-in~~
9. Run `eas init` + preview TestFlight/Play with a real Apple/Google account
10. Server-side SMS gateway (Twilio) for safety-ping (today: SMS drafts on device)
11. Revisit enclave-backed keys / Rust crypto module if counsel requires it

## Testing

Worker evidence APIs (including device claim, sync-lite, upload) are covered in `challenge-tool/test/` — see [TESTING.md](../challenge-tool/TESTING.md).

Native:

```bash
cd witness && npm test
```

Build / Whisper ops: [BUILD.md](./BUILD.md).

Hashing must produce the same lowercase hex SHA-256 as the Worker (`witness/src/hash.ts` ↔ `challenge-tool/evidence-crypto.js`). Merkle root on the server is `SHA-256(transcriptHash:audioHash:videoHash)`.

Transcript packaging never invents speech when Whisper is unavailable (`TRANSCRIPT_PENDING` marker via `src/whisper-format.js`). On constrained links, only the gzip transcript + hashes leave the device.

Expo/EAS device tests are manual until a signed preview build is produced.
