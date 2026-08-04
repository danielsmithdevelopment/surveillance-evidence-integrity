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
| Evidence gzip | `test/evidence-gzip.test.mjs` | Transcript gzip+base64 for rural sync-lite |
| Incident helpers | `test/incident.test.mjs` | Multi-device incident codes + `PEER_LOST` timeouts |
| Evidence API | `test/evidence-api.test.mjs` | Local Worker via `wrangler unstable_dev`: secure, device claim, sync-lite, safety-ping, incident |
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
4. **Rural sync-lite** — `POST /api/evidence/sync-lite` with `transcriptEncoding: "gzip+base64"` registers hashes and stores the transcript inline in one RTT (`mediaPending: true`). Optional `incidentId` tags the package for multi-device correlation.
5. **Safety ping** — `POST /api/evidence/safety-ping` stores a dead-man / interrupt audit record (SMS remains client-side for now).
6. **Multi-device incident** — `POST /api/evidence/incident/create|join|heartbeat|signal` + `GET /api/evidence/incident/:id`. Heartbeats detect `PEER_LOST` when a recording peer goes silent.

Merkle root = `SHA-256(transcriptHash + ":" + audioHash + ":" + videoHash)` (see `evidence-crypto.js`).

## Native app

`witness/` is Expo. Automated coverage today:

```bash
cd witness
npm test                 # packaging, Whisper, rural sync, safety, incident wiring
npx tsc --noEmit         # when dependencies are installed
```

Native hashing must stay aligned with Worker hex digests (`@noble/hashes` full-file SHA-256). Whisper defaults to an honest `TRANSCRIPT_PENDING` stub unless `EXPO_PUBLIC_WHISPER=1` + a native module / model are present. See `witness/BUILD.md` for EAS + model fetch. Multi-device incident UX: create/join code, coordinated start, `incidentId` + `PEER_LOST` notes on packages.

## Production checklist (not automated)

- [ ] Deploy Worker + assets; DNS for challengethefootage.com
- [ ] `ALLOW_TEST_AUTH` unset
- [ ] Google client ID + ClawQL secrets set
- [ ] R2 bucket bound or `R2_*` secrets configured
- [ ] Stripe checkout path verified with a real card in test mode
- [ ] Manual keyboard / screen-reader pass (see README accessibility policy)
