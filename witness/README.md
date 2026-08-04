# Witness (capture module for Challenge the Footage)

Witness is the **encounter recording engine** for [Challenge the Footage](https://challengethefootage.com) — not a separate consumer product.

**Product home:** [challengethefootage.com](https://challengethefootage.com)  
**Evidence (web):** [challengethefootage.com/evidence.html](https://challengethefootage.com/evidence.html)  
**Docs:** [challenge-tool/PRODUCT.md](../challenge-tool/PRODUCT.md)

Users sign in and pay with **Stripe (credit card)** on the website. They never need a crypto wallet. ClawQL performs independent anchoring (e.g. Arweave) and storage behind the scenes.

## Role of this folder

Optional **native** (Expo iOS/Android) capture client for higher reliability than browser MediaRecorder:

- Record video + audio during a police encounter
- On-device transcript (Whisper — still stubbed)
- Priority upload transcript → audio → video
- Device signature + Merkle package
- Hand off to `https://challengethefootage.com/?witnessSession=…` for document prep

Prefer shipping **web recording on CTF** first so one URL covers account, evidence, and documents. Keep this native module for offline / background / enclave hardening.

## Architecture

```
[CTF website /evidence.html]  ← primary UX
[Witness native app]          ← optional capture client
       |
       v
[CTF Worker]  challenge-tool/worker.js
  /api/evidence/secure|sessions|verify
  /api/checkout (Stripe via ClawQL)
  /api/generate
       |
       v
[ClawQL]  inference · Stripe · independent anchor · memory
```

Legacy routes in `witness/worker/` can be folded into the CTF Worker over time.

## Setup (native)

```bash
cd witness
npm install
npx expo start
```

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_WITNESS_API` | Prefer CTF Worker base URL (`https://challengethefootage.com`) once evidence APIs are deployed |

## Incomplete (known)

1. **Audio extraction** — placeholder; wire ffmpeg before production
2. **R2 presigned PUT** — AWS4 signing still TODO in legacy worker
3. **Whisper** — stubbed live transcript
4. **Device keys** — SecureStore placeholder; use enclave/Keychain for production
5. **Full-file SHA-256** — MVP hashes a size+head marker; replace before court use

## Two-party consent

First-run / web evidence flow collects a state code and shows an all-party notice for CA, CT, FL, IL, MD, MA, MI, MT, NH, PA, WA. Not legal advice.

## Verification (attorney / expert)

```
GET https://challengethefootage.com/api/evidence/verify/:sessionId
```

Primary UX only shows “Evidence secured” + a verification ID. Advanced hash / Merkle details are for counsel and experts — not everyday users.
