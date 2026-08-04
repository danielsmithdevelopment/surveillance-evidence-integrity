---
title: Evidence — Challenge the Footage
---

# Evidence

Record a police encounter in the browser, secure it to your **Challenge the Footage** account, then prepare attorney-review documents.

- Sign in with Google (credit-card billing via Stripe for document packs)
- No crypto wallet — independent verification is handled server-side via ClawQL
- Native app: offline / 2G-first capture, personal-safety alerts, optional **multi-device incident** (shared `incidentId`, coordinated start, `PEER_LOST`)
- Continue to [document generator](https://challengethefootage.com/) with `?witnessSession=`

## Public verify

```
GET https://challengethefootage.com/api/evidence/verify/{sessionId}
```

Returns hashes, `merkleRoot`, optional `verificationRef`, and a `howToVerify` checklist. Audio/video bytes are authoritative over imperfect on-device transcripts.

APIs: `POST /api/evidence/secure`, `POST /api/evidence/sync-lite`, `POST /api/evidence/incident/*`, `GET /api/evidence/sessions`, `GET /api/evidence/verify/{id}`

Production deploy: [CLOUDFLARE-DEPLOY.md](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/challenge-tool/CLOUDFLARE-DEPLOY.md).

**Not legal advice.** Recording laws vary by state.
