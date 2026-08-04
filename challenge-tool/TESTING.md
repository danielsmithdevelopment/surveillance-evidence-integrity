# Testing Challenge the Footage

Automated gates live in `npm run ci` (also `.github/workflows/ci.yml`).

## Quick commands

```bash
cd challenge-tool
npm install
npm test                 # node:test — smoke, offline docs, evidence crypto + API
npm run format:check
npm run lint
npm run test:a11y        # Playwright + axe (builds first)
npm run lighthouse       # Lighthouse CI budgets
npm run ci               # all of the above
```

## What each suite covers

| Suite | File(s) | Scope |
|---|---|---|
| Smoke | `test/smoke.test.mjs` | Vendor keys, API route strings, static agent-ready files, evidence handlers |
| Offline docs | `test/offline-docs.test.mjs` | Deterministic FRE templates without ClawQL |
| Evidence crypto | `test/evidence-crypto.test.mjs` | SHA-256 + merkle commitment shared with Worker |
| Evidence API | `test/evidence-api.test.mjs` | Local Worker via `wrangler unstable_dev`: secure, device claim, upload |
| A11y | `test/e2e/a11y.spec.js` | axe WCAG 2.2 A/AA on key pages |
| Lighthouse | `test/lighthouse-runner.mjs` | a11y 100, BP/SEO ≥90 |

## Local Worker (manual / sample generation)

```bash
cp .dev.vars.example .dev.vars   # ALLOW_TEST_AUTH=true, GENERATION_MODE=offline
npm run worker                   # build + wrangler dev :8787
npm run generate:sample          # writes .artifacts/sample-generation/
```

Test bearer: `Authorization: Bearer test:<userId>:<email>`.

**Never** set `ALLOW_TEST_AUTH` in production.

## Evidence flow under test

1. **Authenticated secure** — `POST /api/evidence/secure` with three media hashes → KV record + merkle root.
2. **Device secure + claim** — `POST /api/evidence/secure-device` → claimCode → `POST /api/evidence/claim` with test auth.
3. **Upload** — `POST /api/evidence/upload-url` → `PUT /api/evidence/object/...` with `X-Content-SHA256`. Without R2, metadata is stored and `storage` may be `none`.

Merkle root = `SHA-256(transcriptHash + ":" + audioHash + ":" + videoHash)` (see `evidence-crypto.js`).

## Native app

`witness/` is Expo. Automated coverage today:

```bash
cd witness
npm test                 # transcript packaging + Whisper wiring contract
npx tsc --noEmit         # when dependencies are installed
```

Hashing must stay aligned with Worker hex digests (`@noble/hashes` full-file SHA-256). Whisper defaults to an honest `TRANSCRIPT_PENDING` stub unless `EXPO_PUBLIC_WHISPER=1` + a native module are present.

## Production checklist (not automated)

- [ ] Deploy Worker + assets; DNS for challengethefootage.com
- [ ] `ALLOW_TEST_AUTH` unset
- [ ] Google client ID + ClawQL secrets set
- [ ] R2 bucket bound or `R2_*` secrets configured
- [ ] Stripe checkout path verified with a real card in test mode
- [ ] Manual keyboard / screen-reader pass (see README accessibility policy)
