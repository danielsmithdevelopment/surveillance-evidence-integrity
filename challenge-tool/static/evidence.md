---
title: Evidence — Challenge the Footage
---

# Evidence

Record a police encounter in the browser (installable as a PWA), seal it into a **trust chain** on your **Challenge the Footage** account, then prepare attorney-review documents.

## Trust chain (evidence quality)

1. **Capture** — browser recording + optional notes
2. **Integrity package** — SHA-256 fingerprints for media and notes, bound into a Merkle root
3. **Account custody** — package stored to the signed-in account with a stable verification ID
4. **Independent verification** — `GET /api/evidence/verify/{id}` returns hashes, Merkle root, optional verification reference, and a how-to-verify checklist

That chain improves authenticity for FRE 901-style challenges: counsel can show what was captured and that the package has not been silently swapped — instead of relying only on a vendor’s assertion.

## How to use

- Sign in with Google (Stripe card billing for document packs)
- Continue to [document generator](https://challengethefootage.com/) with `?evidenceSession=`
- Install from your browser / Add to Home Screen for a near-native recorder

## Public verify

```
GET https://challengethefootage.com/api/evidence/verify/{sessionId}
```

Returns hashes, `merkleRoot`, optional `verificationRef`, and a `howToVerify` checklist. Audio/video bytes are authoritative over imperfect on-device transcripts.

APIs: `POST /api/evidence/secure`, `POST /api/evidence/sync-lite`, `POST /api/evidence/incident/*`, `GET /api/evidence/sessions`, `GET /api/evidence/verify/{id}`

Production deploy: [CLOUDFLARE-DEPLOY.md](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/challenge-tool/CLOUDFLARE-DEPLOY.md).

**Not legal advice.** Recording laws vary by state.
