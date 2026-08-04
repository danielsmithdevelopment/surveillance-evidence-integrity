# Challenge the Footage — product model

**One site. One account. No crypto wallets.**

[challengethefootage.com](https://challengethefootage.com) is the product home for civilians (and public defenders) who need to:

1. **Record** a police / enforcement encounter
2. **Secure** that evidence for later verification
3. **Prepare** attorney-review legal templates (FRE 901, FRE 702, Fourth Amendment, § 1983)
4. **Pay** with a normal credit card when they need more generations

## What the user sees

| User-facing | What actually happens |
|---|---|
| Sign in with Google | Google ID token → Worker |
| Record on `/evidence.html` (or native Witness module) | Camera/mic capture → hashes → upload |
| “Evidence secured” | ClawQL anchors a Merkle root (e.g. Arweave). User never sees a chain, wallet, or gas fee |
| Generate documents | ClawQL inference + memory; Stripe Checkout for $9 packs |
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
  → Durable local queue
  → Probe link
       offline      → stay on device
       constrained  → POST /api/evidence/sync-lite (gzip transcript + hashes)
       ok           → sync-lite, then audio/video PUTs
  → Open challengethefootage.com/evidence.html?claim=…&code=…
  → User signs in → POST /api/evidence/claim → evidence appears in their library
```

## Roadmap notes

- Ship **web recording** for one-URL onboarding; ship **Expo native** for reliability (full-file SHA-256, parallel audio, Worker→R2 uploads).
- Never surface “connect wallet”, token tickers, or Arweave TX IDs in primary UI. Optional advanced “Independent verification” panel may show a verification ID for attorneys/experts.
- Consider Rust only as a crypto/hash native module later — not as the app shell.

## Testing & quality

See [TESTING.md](./TESTING.md). CI runs format, lint, unit/API tests (including evidence secure/claim/upload via local Worker), Playwright a11y, and Lighthouse.
