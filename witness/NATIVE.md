# Native capture stack — decision

**Choice for Challenge the Footage Evidence (mobile): Expo / React Native** (`witness/`).

## Why not Tauri / “Rust mobile”?

| Option | Fit for police-encounter recording |
|---|---|
| **Expo / React Native** | Strong camera/mic/permissions, App Store + Play path, already scaffolded here. Best near-term. |
| **Tauri 2 mobile** | Real, but early for production camera capture; stronger on desktop shells than iOS/Android media apps today. |
| **Pure Rust (JNI / Swift bridge)** | Maximum control, maximum cost. Revisit only if RN cannot meet integrity/enclave requirements. |
| **Flutter** | Fine technically; would discard the existing Expo app for little gain. |

We can still use **Rust where it matters later** (hashing, signing) via a native module — without rewriting the whole UX in Rust.

## Product role

- **Website** (`challengethefootage.com`) — account, Stripe, docs, web record, evidence library
- **Native app** (`witness/`) — one-tap capture when the browser is not enough (background, offline, faster cold start)

Users brand-perceive **Challenge the Footage**, not a separate crypto/Arweave app.

## Capture UX rule

**Record first, account later.** Mid-encounter must not require Google sign-in.

1. Native records → hashes → `POST /api/evidence/secure-device` (device + claim code)
2. User opens Challenge the Footage → signs in → claims the session (or deep-link auto-claim)
3. ClawQL independently anchors behind the scenes; Stripe only for document packs

## Near-term build order

1. Point native at CTF Worker evidence APIs (done alongside this doc)
2. Device-first secure + claim on website
3. Full-file SHA-256 + real audio extract (ffmpeg)
4. Google auth session in-app (optional; claim-via-browser is enough for v1)
5. EAS Build / TestFlight / Play internal track
6. Revisit enclave-backed keys / Rust crypto module if counsel requires it
