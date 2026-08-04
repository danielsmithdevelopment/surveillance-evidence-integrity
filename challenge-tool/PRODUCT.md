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

Native `witness/` remains an optional high-reliability capture client that **signs into the same product** and deep-links back to the website. Branding and account live on Challenge the Footage.

## Payments

- **Stripe Checkout only** (via ClawQL payments gateway).
- First document generation free per account; PDs unlimited; additional generations $9.
- Evidence recording is free to capture; storage/anchoring is billed/operated server-side — never via a user crypto wallet.

## Backend split of responsibility

```
Browser / Witness app
  → Challenge the Footage Worker (public API)
      → ClawQL gateway
           → chat / memory (docs)
           → Stripe checkout (payments)
           → surveillance/witness/anchor (independent verification)
      → Object storage (R2) for artifacts
```

## Roadmap notes

- Prefer **web recording on CTF** so one URL covers signup, evidence, and docs.
- Keep native Witness for offline / background / enclave hardening once productized under the same account.
- Never surface “connect wallet”, token tickers, or Arweave TX IDs in primary UI. Optional advanced “Independent verification” panel may show a verification ID for attorneys/experts.
