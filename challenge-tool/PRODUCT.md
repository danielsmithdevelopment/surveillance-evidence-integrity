# Challenge the Footage — product model

**One site. One account. No crypto wallets.**

[challengethefootage.com](https://challengethefootage.com) is the product home for civilians (and public defenders) who need to:

1. **Record** when they do not feel safe — police / enforcement encounters, marketplace meetups, first dates, walking alone at night, and similar situations
2. **Secure** that evidence (on-device first; works on weak / 2G links)
3. **Alert** trusted contacts if a check-in is missed or recording ends unexpectedly
4. **Multi-device incident** capture — multi-angle / multi-mic like multiple body cams (independent packages, shared `incidentId`)
5. **Challenge** camera evidence in court-ready templates — same four vectors for **fixed/ALPR**, **body-worn**, and **cell phone** footage (see [FOOTAGE-CHALLENGE.md](./FOOTAGE-CHALLENGE.md))
6. **Pay** with a normal credit card when they need more generations

**Challenge-grade capture** (phones → body cams → ALPR/fixed cams): see [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md). Document generation applies matching legal pressure to all three.

## What the user sees

| User-facing | What actually happens |
|---|---|
| Sign in with Google | Google ID token → Worker |
| Record on `/evidence.html` (or native Evidence app) | Camera/mic capture → hashes → upload |
| Situation presets + emergency contacts | Dead-man check-in + interrupt SMS drafts + safety-ping API |
| “Evidence secured” / interrupted recovery | ClawQL anchors a Merkle root when online. User never sees a chain, wallet, or gas fee |
| Generate documents (pick footage category) | Mode-aware FRE 901 / 702 / 4th Am / §1983 templates; Stripe for $9 packs |
| Public defender access | Email whitelist; unlimited generations |

Users are **not** expected to understand ClawQL, Arweave, Merkle trees, or R2. Those are implementation details.

## Product surface (website)

```
challengethefootage.com/
  /                 Docs generator (case form + four templates)
  /evidence.html    Record + evidence library + verification status
  /public-defenders.html
  /terms.html
  /api/*            Auth, entitlement, Stripe checkout, generate, evidence
```

Native `witness/` is the **Expo / React Native** companion for high-reliability capture (see [witness/NATIVE.md](../witness/NATIVE.md)). Branding and account live on Challenge the Footage. Tauri / pure Rust mobile are deferred.

## Payments

- **Stripe Checkout only** (via ClawQL payments gateway).
- First document generation free per account; PDs unlimited; additional generations $9.
- Evidence recording is free to capture; storage/anchoring is billed/operated server-side — never via a user crypto wallet.

## Backend split of responsibility

```
Browser / Native (Expo) app
  → Challenge the Footage Worker (public API)
      → ClawQL gateway
           → chat / memory (docs)
           → Stripe checkout (payments)
           → surveillance/witness/anchor (independent verification)
      → Object storage (R2) for artifacts
```

### Record-first (native)

```
Native record (no Google mid-encounter; works offline)
  → On-device Whisper (when linked) + full-file SHA-256
  → If force-quit / camera kill → interrupted package + contact alerts
  → Durable local queue
  → Probe link
       offline      → stay on device
       constrained  → POST /api/evidence/sync-lite (gzip transcript + hashes)
       ok           → sync-lite, then audio/video PUTs
  → Open challengethefootage.com/evidence.html?claim=…&code=…
  → User signs in → POST /api/evidence/claim → evidence appears in their library
```

### Personal safety (native)

- **Situations:** police, marketplace meetup, first date, night walk, other
- **Check-in timer:** missed check-in → SMS drafts to emergency contacts + `POST /api/evidence/safety-ping`
- **Interrupt recovery:** process death / unexpected stop → keep honest pending hashes, alert contacts, sync-lite when possible
- Not a guarantee against harm — a private record + trusted-contact signal when things go wrong

### Multi-device incident (multi-angle / multi-mic)

```
Create or join incident code
  → Heartbeats (~4s)
  → Any member signals start → all members begin independent recordings
  → PEER_LOST logged if a recording peer misses heartbeats
  → Each device sync-lite’s its own package tagged with incidentId
```

Same pattern we want for multi-BWC and multi-sensor incidents — demonstrated first on civilian phones. See [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md).

## Roadmap notes

- Ship **web recording** for one-URL onboarding; ship **Expo native** for reliability (full-file SHA-256, parallel audio, Worker→R2 uploads).
- Multi-device incident → attorney UI grouping by `incidentId` + transcript cross-reference (intersection / union / conflicts).
- Push Challenge-grade requirements into body-cam / ALPR procurement (model legislation + contracts).
- Never surface “connect wallet”, token tickers, or Arweave TX IDs in primary UI.
- Consider Rust only as a crypto/hash native module later — not as the app shell.

## Testing & quality

See [TESTING.md](./TESTING.md). CI runs format, lint, unit/API tests (including evidence secure/claim/upload via local Worker), Playwright a11y, and Lighthouse.
