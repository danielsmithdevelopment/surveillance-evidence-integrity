# Challenge the Footage — Product Specification (Current)

**Last updated:** August 5, 2026  
**Status:** Reflects merged PRs #1–#9 on `main`  
**Live site:** [challengethefootage.com](https://challengethefootage.com) (Worker deploy pending — currently Cloudflare 530)  
**Repo:** [danielsmithdevelopment/surveillance-evidence-integrity](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity)

Canonical challenge operator guide: [FOOTAGE-CHALLENGE.md](./FOOTAGE-CHALLENGE.md).  
Production deploy: [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md).  
Go-live (entity, Stripe, ClawQL, web + Witness app): [../GO-LIVE.md](../GO-LIVE.md).  
Challenge-grade integrity thesis: [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md).

---

## What this product is

Challenge the Footage is a **unified evidence product** with three capture classes and a document-generation layer. It is not three separate tools. It is one product with a single integrity pipeline, a single Worker backend, and a single legal-argument framework that applies across capture types.

```
[Evidence capture]
   Fixed ALPR / surveillance (vendor-sourced facts → challenge docs)
   Body-worn camera (officer-sourced; may be missing / partial / recorded)
   Cellphone / web recording (civilian-sourced via /evidence.html or Witness native)
         |
         v
[Integrity pipeline]
   SHA-256 hashes → Merkle root → ClawQL anchor (when online) → public verify endpoint
         |
         v
[Document generation]
   Four FRE vectors × three footage categories (+ BWC recording-status ratchet)
   challengethefootage.com (web) + future attorney UI
```

**What it is not:**

- A crypto product (no wallet UX; no Arweave TX in primary civilian UI)
- A surveillance company (ClawQL / R2 / Arweave are invisible infrastructure)
- Three separate apps (legacy `witness/worker` is deprecated; everything runs through the challenge-tool Worker)

**One-liner for users:** Record when you do not feel safe, secure evidence on weak links, generate attorney-review templates, pay with a normal card.

---

## Architecture

### Single Worker backend

All APIs run through `challenge-tool/worker.js` (+ static assets):

```
challenge-tool Worker
├── GET  /api/health
├── POST /api/checkout                 Stripe Checkout via ClawQL payments
├── GET  /api/entitlement              Paid / PD whitelist / free tier
├── POST /api/generate                 Docs via ClawQL gateway or offline templates
├── GET  /api/history                  Past doc sessions (auth)
├── GET  /api/session/:id              Single doc session (auth)
├── POST /api/evidence/secure          Web: hashes + optional transcript → receipt
├── POST /api/evidence/secure-device    Native: device-first package + claim code
├── POST /api/evidence/sync-lite       Rural: gzip transcript + hashes (one RTT)
├── POST /api/evidence/claim           Claim device session after Google sign-in
├── POST /api/evidence/upload-url       Mint upload URL for transcript|audio|video
├── PUT  /api/evidence/object/:id/:type  Upload artifact bytes → R2 / inline
├── GET  /api/evidence/sessions        Library for authenticated user
├── GET  /api/evidence/verify/:id      Public verification (no auth)
├── POST /api/evidence/safety-ping     Check-in / interrupt audit
├── POST /api/evidence/incident/create
├── POST /api/evidence/incident/join
├── POST /api/evidence/incident/heartbeat
├── POST /api/evidence/incident/signal
└── GET  /api/evidence/incident/:id
```

### Storage

| Store | Role |
|---|---|
| **Workers Static Assets** | Built UI (`static/`) |
| **Workers KV (`RATE_LIMIT_KV`)** | Free-tier counters, PD whitelist, evidence metadata/index, incidents, safety-ping audit, upload mint records |
| **R2 (`EVIDENCE_BUCKET` preferred)** | Transcript / audio / video bytes (S3-style `R2_*` secrets are fallback) |
| **ClawQL gateway** | Doc LLM, Stripe checkout, evidence anchor |
| **ClawQL payments** | Entitlement + Checkout — **no raw Stripe secret in this Worker** |

Deploy creates **one** KV namespace (`RATE_LIMIT_KV`) and optionally R2 (`ctf-evidence`) — preferably via [../infra/](../infra/) Pulumi, then `npm run sync` into `wrangler.toml`. There are no separate `SESSIONS_KV` / `DEVICE_REGISTRY_KV` bindings.

### Authentication

- **Google Identity Services** — primary web auth; Worker verifies ID token; injects `GOOGLE_CLIENT_ID` into HTML at the edge
- **Record-first** — Witness does not require Google mid-encounter; claim on the website afterward
- **Local demo only** — `ALLOW_TEST_AUTH=true` accepts `Bearer test:<userId>:<email>` (**never in production**)
- **PD whitelist** — KV key `pd_whitelist:{email}` = `true` (manual via wrangler)

---

## What the user sees

| User-facing | What actually happens |
|---|---|
| Sign in with Google | Google ID token → Worker |
| Record on `/evidence.html` or native app | Capture → hashes → upload / sync-lite |
| Situation presets + emergency contacts | Check-in timer + SMS drafts + `safety-ping` |
| “Evidence secured” / interrupted recovery | Hashes + optional ClawQL anchor; no wallet UX |
| Generate docs (category + BWC status) | Mode-aware FRE 901 / 702 / 4th Am / §1983 |
| Public defender access | Email whitelist; unlimited generations |

Users are **not** expected to understand ClawQL, Arweave, Merkle trees, or R2.

### Product surface (website)

```
challengethefootage.com/
  /                      Docs generator
  /evidence.html         Record + library + verify status
  /public-defenders.html
  /terms.html
  /api/*                 Auth, entitlement, checkout, generate, evidence
```

---

## Footage categories

IDs used in API + UI (`footageCategory`):

| ID | Source | Key legal issue |
|---|---|---|
| `fixed_surveillance` | Vendor ALPR / fixed CCTV | FRE 901 authenticity + FRE 702 accuracy + query abuse |
| `body_worn` | Officer BWC / in-car | Duty to record (Stage 1) → authenticity (Stage 2) |
| `cellphone` | Civilian phone / web capture | No authenticity presumption without cryptographic proof; Challenge-grade civilian capture as the floor |

The same four FRE vectors apply across all three. Fact packs, precedents, and discovery language differ. See [FOOTAGE-CHALLENGE.md](./FOOTAGE-CHALLENGE.md).

---

## Four legal vectors (all categories)

### Vector 1 — FRE 901: Authentication

- **Fixed / ALPR:** No major vendor publicly documents hash-at-capture in camera hardware, Merkle-chained audit logs, or external immutable anchoring independent of the vendor.
- **Body-worn:** Evidence.com-class clouds as sole oracle = vendor assertion. Demand hash before leave-device, mute/dock/export logs, third-party verifiable export.
- **Cellphone:** Civilian Challenge-grade packages (hashes + optional external anchor + public verify) raise the floor; chat exports / AI-altered clips without proof should not receive a reliability presumption.

### Vector 2 — FRE 702 / Daubert: Accuracy

Documented ~10% ALPR misread estimates; IJ wrongful-stop pattern; DHS market-survey acknowledgment of character confusion without a hard floor. Proposed procurement floor: **≤0.1%**, independently certified.

For BWC, reliability pressure also hits mute gaps, non-activation, dock re-encode, and vendor AI assist (transcript/redaction/search) as secondary model-error risk.

### Vector 3 — Fourth Amendment: Access / suppression

FOIA-derived patterns of case-number-less queries; documented officer misuse of ALPR for romantic tracking. Stops initiated on unreliable hits + missing required BWC raise Brady / due-process / statutory-inference arguments.

### Vector 4 — 42 U.S.C. § 1983: Civil damages

Wrongful stop / detention / arrest theories; settlement ranges and fee-shifting under §1988 as demand-letter framing. State QI reform (e.g. CO / NM) noted where relevant in templates.

---

## Body-worn recording status (BWC ratchet)

When body-cam footage is **missing**, argue duty-to-record / spoliation first. When a file **exists**, argue authenticity. Partial recordings do both.

```
bodyCamRecordingStatus:
  missing   → Stage 1 primary (duty to record; adverse inference / statutory presumption)
  partial   → Stage 1 for gaps + Stage 2 for fragments
  recorded  → Stage 2 primary (FRE 901 integrity); keep Stage 1 ready if logs show gaps
```

### Stage 1 — Duty to record (`missing` / `partial`)

Policy (and in some jurisdictions statute) required activation. Legal themes in generated docs:

- Adverse inference / spoliation framing
- Brady / due-process incompleteness of the record
- Discovery: BWC policy, activation/mute/dock logs, prior non-compliance, other officers’ cameras, Evidence.com export audit

Precedents / fact packs: see `footage-modes.js` and [FOOTAGE-CHALLENGE.md](./FOOTAGE-CHALLENGE.md) (Havens, COPA, Billings-style, etc.).

### Stage 2 — Authenticity (`recorded`, and any later-produced file)

Same cryptographic gap as fixed cameras: hash before leave-device, tamper-evident activation logs, external anchor. Push vendors toward Challenge-grade / clawql-surveillance-class controls.

---

## Integrity pipeline

### Merkle root

```
merkleRoot = SHA-256(transcriptHash + ":" + audioHash + ":" + videoHash)
```

(lowercase hex). Shared between Worker (`evidence-crypto.js`) and native (`witness/src/hash.ts`).

### STT honesty

- On-device Whisper when linked (`whisper.rn` + bundled/fetched **ggml-tiny.en** ~75MB by default; larger models optional)
- If Whisper is unavailable, packaging uses **`TRANSCRIPT_PENDING`** — never invents speech
- **Audio and video bytes are authoritative** if wording differs; verify response states this
- Imperfect STT is expected noise and does **not** undermine the product

### Rural sync-lite

1. Gzip transcript + three hashes → `POST /api/evidence/sync-lite` (works on constrained links)
2. Audio / video via `upload-url` + `PUT .../object/...` when the link improves
3. Whatever already left the device stays secured; media never blocks transcript commitment

### Public verify

```
GET /api/evidence/verify/{sessionId}
```

No auth. Typical fields:

- `transcriptHash`, `audioHash`, `videoHash`, `merkleRoot`
- `status` (`secured_local` | `secured_pending_anchor` | `anchored` | …)
- `verificationRef` — external anchor id when ClawQL has anchored (often an Arweave tx); **null until then**
- `howToVerify` — string[] checklist (Merkle composition, re-hash files, optional external record, STT honesty)
- Incident / interrupt / mediaPending flags when present

Counsel-facing surface. Do **not** put wallet prompts or raw chain UX in the civilian primary UI.

---

## Multi-device incident coordination

Renamed from “swarm” → **incident** (PR #4).

- Create / join short code → shared `incidentId`
- Heartbeats (~4s); start signal so peers begin **independent** recordings
- `PEER_LOST` logged if a recording peer misses heartbeats
- Each device keeps its own hashes / Whisper transcript; never merge mics into one invented “AI truth”
- Later attorney UI: group by `incidentId` + transcript cross-ref (intersection / union / conflicts) — **not shipped yet**

APIs live under `/api/evidence/incident/*` (not `/api/incident/*`).

---

## Personal safety (native)

Distinct from “challenge the state’s camera”:

- **Situations:** police, marketplace meetup, first date, night walk, other
- **Check-in timer:** missed check-in → SMS drafts to emergency contacts (last location) + `POST /api/evidence/safety-ping`
- **Interrupt recovery:** force-quit / unexpected stop → honest pending package + alerts + sync-lite when possible
- Not a 911 replacement — private record + trusted-contact signal

---

## Document generation

### Inputs

- `footageCategory`: `fixed_surveillance` | `body_worn` | `cellphone`
- `bodyCamRecordingStatus` (body_worn only): `missing` | `partial` | `recorded`
- Vendor key (server profiles: Flock, Axon, Motorola, Genetec, Verkada, cellphone, custom)
- Case caption fields + free-text facts (search / civil harm / additional)

### Vendor profiles (fixed / BWC)

Server-side in Worker / `footage-modes.js` — FOIA/IJ/COPA-style facts, not browser-editable catalogs.

### Cellphone path

Deep-link `/?witnessSession={sessionId}` pre-fills case facts with the session id. Counsel pulls hashes / `verificationRef` from the **verify** endpoint — the generator does not require surfacing Arweave TX IDs in the civilian form.

### Offline vs gateway

- `GENERATION_MODE=offline` or missing ClawQL secrets → deterministic `offline-docs.js` templates (CI / local)
- Production with ClawQL → gateway prompts enriched by category + BWC status

### WebMCP

Homepage tools expose footage categories / OpenAPI / navigation for agent clients.

---

## Business model

| Tier | Rule |
|---|---|
| Free | First document generation per account (KV-tracked) |
| Paid | $9 per additional generation — Stripe Checkout via ClawQL (`POST /api/checkout`) |
| Public defenders | Unlimited after `pd_whitelist:{email}` |
| Recording | Free to capture; storage/anchoring operated server-side |
| Sponsor-a-generation | Future — sponsor@ / PD pool (page copy exists; mechanism low priority) |

---

## Auth flows

**Web**

1. GIS sign-in (or local demo when `ALLOW_TEST_AUTH`)
2. `Authorization: Bearer <Google ID token>` on `/api/*`
3. ToS acceptance in localStorage before generate

**Native**

1. Record immediately (SecureStore device id; no Google)
2. Sync-lite / uploads with claim code
3. Open `/evidence.html?claim=…&code=…` → sign in → `POST /api/evidence/claim`

Evidence metadata TTL is long-lived in KV (years). Upload mint URLs are short-lived (~24h). Do not assume a hard “30-day unclaimed delete” unless explicitly added later.

---

## Deployment

Full runbook: **[CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md)**.  
Infra (KV / R2 / routes): **[../infra/README.md](../infra/README.md)**.

Summary (Pulumi + Wrangler):

```bash
cd infra
npm install && pulumi stack init prod
pulumi config set accountId <CLOUDFLARE_ACCOUNT_ID>
export CLOUDFLARE_API_TOKEN=…
npm run up:sync                 # creates KV+R2, writes wrangler.toml bindings

cd ../challenge-tool
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put CLAWQL_GATEWAY_URL
npx wrangler secret put CLAWQL_API_KEY
npm run deploy

# phase 2 — custom domain
cd ../infra
pulumi config set zoneId <ZONE_ID>
pulumi config set enableRoutes true
pulumi up
```

**Do not** set `ALLOW_TEST_AUTH` or put a Stripe secret key on this Worker.  
**Currently blocked:** production Worker not attached → site 530.

---

## Native app (Witness / Evidence)

| Item | Current state |
|---|---|
| Stack | Expo / React Native (`witness/`) |
| Backend | Same CTF Worker evidence APIs |
| Guides | [../witness/README.md](../witness/README.md), [NATIVE.md](../witness/NATIVE.md), [BUILD.md](../witness/BUILD.md), [FIRST-NATIVE-DEPLOY.md](../witness/FIRST-NATIVE-DEPLOY.md) |
| First ship target | Android EAS **preview APK** |
| Activation shipped | In-app start recording |
| Activation roadmap | Siri / Assistant open-app shortcuts, shake-to-record, home-screen widget |
| Device id | Expo SecureStore today; hardware enclave signatures roadmap |
| Whisper | Optional native module + **tiny.en**; stub is honest |
| Audio | Parallel mic preferred; optional ffmpeg extract |

---

## Repo map (high level)

```
surveillance-evidence-integrity/
├── README.md
├── authentication-challenge-guide.md
├── model-contract-language.md
├── model-legislation.md
├── technical-standards.md
├── FOR-VENDORS.md
├── challenge-tool/
│   ├── PRODUCT.md                 ← this file
│   ├── FOOTAGE-CHALLENGE.md
│   ├── CHALLENGE-GRADE.md
│   ├── CLOUDFLARE-DEPLOY.md
│   ├── TESTING.md
│   ├── AGENT-READY.md
│   ├── worker.js
│   ├── footage-modes.js
│   ├── offline-docs.js
│   ├── wrangler.toml
│   ├── src/App.jsx                # docs UI
│   ├── src/EvidencePage.jsx
│   └── static/                    # vite build output
└── witness/
    ├── App.tsx
    ├── README.md
    ├── NATIVE.md
    ├── BUILD.md
    └── FIRST-NATIVE-DEPLOY.md
```

---

## Open items (next)

| Item | Reference | Priority |
|---|---|---|
| Deploy production Worker + DNS | [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md) | **Blocker** (site 530) |
| Go live: entity, Stripe, web + Witness app | [../GO-LIVE.md](../GO-LIVE.md) | **Blocker** for charging money; app follows web same window |
| First Android EAS preview APK | [FIRST-NATIVE-DEPLOY.md](../witness/FIRST-NATIVE-DEPLOY.md) | High |
| Attorney UI: group by `incidentId` + transcript cross-ref | CHALLENGE-GRADE / NATIVE roadmap | High |
| Challenge-grade one-pager for councils / PDs | [../outreach/ONE-PAGERS.md](../outreach/ONE-PAGERS.md) (draft landed) | High — print / distribute |
| Shake / Siri / widget activation | witness README | Medium |
| Enclave / Keychain device signatures | NATIVE.md | Medium |
| Two-party consent first-run polish (state-specific) | Evidence web + native | Medium |
| Sponsor-a-generation mechanism | Business model | Low |

---

## Design decisions locked in

- **“Incident” not “swarm”** — law-enforcement encounter language
- **Imperfect STT is expected noise** — inventing speech or treating Whisper as the encounter would undermine credibility; audio/video are authoritative
- **No Arweave TX / wallet in primary civilian UI** — counsel uses `/api/evidence/verify/{id}`
- **Record-first, auth-deferred** — no Google login while a stop is in progress
- **One Worker, not two** — legacy Witness Worker deprecated
- **BWC missing → Stage 1 first** — failure-to-record before authenticity theater

---

## Testing & quality

See [TESTING.md](./TESTING.md). CI: Prettier, ESLint + jsx-a11y, node:test (including evidence API via local wrangler), Playwright axe, Lighthouse gates.
