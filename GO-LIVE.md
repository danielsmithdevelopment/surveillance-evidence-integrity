# Challenge the Footage — Go-live plan

**Audience:** you (operator), not end users.  
**Goal:** take [challengethefootage.com](https://challengethefootage.com) from Cloudflare **530** → live web (Stripe + Google + PD access), then ship the **Witness** native app shortly after — Android preview APK first, iOS TestFlight next.  
**Not legal / tax advice** — treat entity and compliance rows as a checklist to run past a lawyer/CPA in your state.

Related: [challenge-tool/CLOUDFLARE-DEPLOY.md](./challenge-tool/CLOUDFLARE-DEPLOY.md) · [infra/README.md](./infra/README.md) · [challenge-tool/PRODUCT.md](./challenge-tool/PRODUCT.md) · [witness/FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md) · [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md)

---

## Product shape (web + app)

| Surface | Job | Money |
|---|---|---|
| **Website** | Docs generation, Google sign-in, Stripe, claim/verify, PD whitelist | `$9` after free first; PDs free |
| **Witness app** | Field capture: record-first, offline/2G sync, Whisper, safety, multi-device incident | Same CTF account on the website — no in-app Stripe |

Web can soft-launch alone for docs. The **full** product story (record → secure → challenge) needs the app within days/weeks of web going live — not months later.

Ship order: **web → Android APK (sideload) → iOS TestFlight → store listings (later).**

---

## Current blockers

| Blocker | Why it matters |
|---|---|
| Worker not attached to DNS | Site returns **530**; web *and* app APIs fail |
| Stripe / ClawQL payments | `$9` checkout and paid entitlement |
| Google OAuth web client | Sign-in on `/` and `/evidence.html` |
| Business identity for Stripe | Stripe usually wants a legal entity or sole prop + bank + tax ID |
| Expo / EAS project | Required to build Witness APK/IPA ([FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md)) |

---

## Phase 0 — Decide how you operate

### Business entity

| Option | When it fits |
|---|---|
| **Sole prop (DBA optional)** | Fastest; Stripe can onboard individuals; personal tax reporting |
| **LLC (recommended for most)** | Separates personal assets; looks cleaner for Stripe / bank / “Challenge the Footage”; still pass-through tax in most US states unless you elect otherwise |
| **Corp (C/S)** | Usually overkill at $9/doc launch |

Practical minimum for Stripe + bank:

1. Pick structure with a CPA/attorney (state of formation matters for fees/taxes).  
2. If LLC: form in your state (or common formation state if advised), get **EIN** from IRS (free, online).  
3. Open a **business bank account** in the entity/sole-prop name.  
4. Decide who owns the Stripe account (entity) and who is the beneficial owner for KYC.

Also decide:

- Registered agent / operating agreement (LLC)  
- Whether you need sales tax / marketplace facilitator rules for digital docs (CPA — often digital services, state-dependent)  
- Privacy / ToS already exist at `/terms.html` — have counsel skim before charging money  

### Brand / contact surface

| Item | Status / action |
|---|---|
| Domain `challengethefootage.com` | Must be on Cloudflare DNS for Worker routes |
| `pd@challengethefootage.com` | Mailbox or forward for PD whitelist requests |
| `sponsor@challengethefootage.com` | Optional forward for now |
| `hello@` / support | Use `hello@clawql.com` or add CTF inbox — keep ToS contact accurate |

---

## Phase 1 — Money path (Stripe + ClawQL)

CTF Worker does **not** hold Stripe secret keys. Checkout is:

`POST /api/checkout` → ClawQL gateway → `/payments/stripe/checkout` → Stripe Checkout → return URL on CTF.

### You do

1. **Stripe account** at [stripe.com](https://stripe.com) under the entity/sole prop from Phase 0.  
2. Complete Stripe **KYC** (legal name, EIN/SSN, bank, address, product description: “Legal document templates — Challenge the Footage”).  
3. Start in **Test mode**; switch to **Live** only after a successful test checkout against production CTF.  
4. Connect Stripe to **ClawQL payments** the way your ClawQL/clawql-payments setup expects (dashboard API keys or Connect — follow ClawQL docs, not this Worker).  
5. Confirm product amount **$9.00 USD** one-time matches Worker (`unitAmount: 900`).  
6. Success / cancel URLs must be your live origin, e.g.  
   `https://challengethefootage.com/?payment=success`  
   `https://challengethefootage.com/?payment=cancelled`

### ClawQL side

| Need | Notes |
|---|---|
| `CLAWQL_GATEWAY_URL` | e.g. docs/gateway host used by Worker |
| `CLAWQL_API_KEY` | Virtual key with payments + chat + witness/anchor scopes as required |
| Payments entitlement API | `GET /payments/entitlement/:userId` must reflect free-first + paid packs |
| Anchor (optional at soft launch) | `/surveillance/witness/anchor` — evidence can stay `secured_local` until this works |

### Soft-launch without live cards

Possible for internal dogfood: deploy with Google + offline or gateway docs, **no** live Stripe — second generation fails closed until payments are linked. Prefer test-mode Stripe before any public “$9” claim.

---

## Phase 2 — Identity (Google Sign-In)

1. Google Cloud project → OAuth consent screen (External; add test users while “Testing”).  
2. OAuth client → **Web application**.  
3. Authorized JavaScript origins:  
   - `https://challengethefootage.com`  
   - `https://www.challengethefootage.com` (if used)  
   - temporary `https://challenge-the-footage.<account>.workers.dev`  
4. Put client ID in Worker secret: `wrangler secret put GOOGLE_CLIENT_ID` (Worker injects into HTML).  
5. Publish consent screen when ready for anyone to sign in (or keep Testing + allowlist).

Never enable `ALLOW_TEST_AUTH` on production.

---

## Phase 3 — Cloudflare go-live (kills the 530)

Follow [CLOUDFLARE-DEPLOY.md](./challenge-tool/CLOUDFLARE-DEPLOY.md) + [infra/README.md](./infra/README.md).

### Order

1. **Cloudflare** account; zone `challengethefootage.com` on CF nameservers.  
2. **API token** (Workers KV, R2, Routes).  
3. **R2 state bucket** (once): `npx wrangler r2 bucket create ctf-pulumi-state` + R2 API token for Pulumi DIY backend.  
4. **GitHub** secrets/vars for [Infra (Pulumi)](./.github/workflows/infra-pulumi.yml) **or** local `infra` `pulumi up` + sync.  
5. **Secrets on Worker:** `GOOGLE_CLIENT_ID`, `CLAWQL_GATEWAY_URL`, `CLAWQL_API_KEY`.  
6. `cd challenge-tool && npm run deploy` → smoke `workers.dev`.  
7. Enable routes (`PULUMI_ENABLE_ROUTES` / `zoneId`) → apex + www.  
8. Confirm `/api/health` → `ok: true`, `testAuthEnabled: false`.

### Merge note

PR **#12** (GitHub Actions + R2 DIY Pulumi backend) should be on `main` before relying on Actions apply — or run Pulumi locally from `infra/`.

---

## Phase 4 — Product smoke (production)

Checklist (also in CLOUDFLARE-DEPLOY / TESTING):

- [ ] Homepage + ToS modal; Google button works  
- [ ] Free first generation (fixed / body-worn missing / cellphone)  
- [ ] Second generation → Stripe Checkout (test then live)  
- [ ] Return from Checkout restores entitlement  
- [ ] `/evidence.html` record/secure (or skip camera on desktop; still test sign-in + sessions)  
- [ ] `GET /api/evidence/verify/{sessionId}` returns hashes + `howToVerify`  
- [ ] PD: whitelist one test email via  
  `wrangler kv key put --binding=RATE_LIMIT_KV "pd_whitelist:you@…gov" "true"`  
- [ ] Mailbox `pd@` monitored; process = email → whitelist → reply  
- [ ] Re-scan agent readiness if you care ([AGENT-READY.md](./challenge-tool/AGENT-READY.md))

---

## Phase 5 — Soft launch (web) then app within the same window

### Soft launch — web first (days 0–few)

- Live domain, Google, Stripe **test** or limited live  
- Share with a few PDs / friendly attorneys only  
- Collect: broken copy, wrong jurisdiction assumptions, checkout friction  
- Print [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md) for 1–2 council / PD conversations  

### Soft launch — app immediately after (same week / next)

Do **not** wait for Play/App Store. Goal: a handful of trusted phones running a real EAS build pointed at prod.

- Android **preview APK** sideloaded to your phone + 1–2 testers  
- Confirm record → hash → sync → claim on website  
- Then iOS **TestFlight** for iPhone users in the same cohort  

### Public launch (web + app story)

- Stripe **Live** mode  
- OAuth consent **In production**  
- Announce: site **and** how to get the Android APK / TestFlight (invite-only is fine)  
- Say clearly: field capture = Witness app; docs/pay = website  

### Explicit non-goals for first public week

- Play Store / App Store **production** listing (internal/sideload is enough)  
- Enclave device keys / Siri / shake  
- Sponsor-a-generation automation  
- Attorney incident cross-ref UI  

---

## Phase 6 — Witness app go-live (near-term, not “later someday”)

Full how-to: [witness/FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md) · Whisper/EAS: [witness/BUILD.md](./witness/BUILD.md).

### Why the app exists in go-live

Website `/evidence.html` is fine for demos. Real encounters need **offline / weak-data** sync, on-device Whisper when available, safety check-ins, and optional multi-device **incident** (`incidentId`). That is Witness.

### Accounts & identity (app-specific)

| Item | When | Notes |
|---|---|---|
| Free [Expo](https://expo.dev/signup) account | Before first build | You log in on your laptop (`eas login`) — cloud agents cannot do this for you |
| `eas init` → real `projectId` | Once | Links `witness/` to EAS; commit or set `EAS_PROJECT_ID` |
| EAS-managed Android keystore | First Android build | Say yes when prompted |
| Apple Developer (~$99/yr) | Before iOS TestFlight | Enroll early; approval can lag |
| App Store Connect app | With Apple | Bundle ID `com.challengethefootage.evidence` |
| Google Play Console | Only for store listing | **Not** required for sideload APK |

Same LLC/sole prop from Phase 0 should own Apple / Play accounts when you open them (seller/legal entity name).

### Env / API (must match live Worker)

EAS profiles already default to production:

- `EXPO_PUBLIC_CTF_API=https://challengethefootage.com`  
- `EXPO_PUBLIC_CTF_WEB=https://challengethefootage.com`  
- `EXPO_PUBLIC_WHISPER=1`  

If the site is still 530, **fix the Worker first** — the app cannot sync/claim without it. For a temporary Worker URL, override in `eas.json` `build.preview.env` or `.env`.

### 6a — Android preview APK (do this right after web works)

1. On your machine: `cd witness && npm i && npm i -g eas-cli && eas login && eas init`  
2. Optional: `npm run whisper:fetch` so rural offline STT is in the binary  
3. `eas build --profile preview --platform android` → download APK from Expo  
4. Sideload (unknown apps) on a physical Android phone  
5. Smoke: emergency contact + short check-in → record 20s → Stop & secure → sync when online → open claim/docs on the website  

You are **not** on Play Store yet. That is correct for soft launch.

### 6b — iOS TestFlight (days after Android feels good)

1. Apple Developer Program approved; App Store Connect app created  
2. `eas build --profile preview --platform ios` (EAS creates certs/profiles)  
3. `eas submit` → TestFlight → internal testers  
4. Same smoke as Android; deep-link / claim still on the website  

### 6c — Store production (after soft launch, not day one)

| Track | Need |
|---|---|
| Play internal / production | Play Console + service account JSON in `eas.json` submit |
| App Store | Privacy policy URL (`/terms.html`), screenshots, review notes |
| Both | Same legal entity as Stripe where possible; age rating / sensitive-use copy honest about recording |

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
eas submit ...
```

### App smoke checklist (prod API)

- [ ] Record without Google (auth deferred)  
- [ ] Hashes + queue survive airplane mode / weak radio  
- [ ] Sync-lite order: transcript → audio → video  
- [ ] Whisper: bundled **or** in-app download on Wi‑Fi; imperfect STT OK  
- [ ] Safety check-in / contact flow does not block record  
- [ ] Multi-device incident: shared `incidentId`, coordinated start (if testing that path)  
- [ ] Claim / docs on website with `?witnessSession=` (or equivalent)  
- [ ] `GET /api/evidence/verify/{sessionId}` shows hashes + `howToVerify`  

### What stays website-only

Stripe checkout, Google account linking for paid gens, PD whitelist, document download — all on CTF web. App deep-links there; do not rebuild payments in-app for v1.

---

## Phase 7 — Outreach after web + app are dogfoodable

| Item | Doc |
|---|---|
| Council / PD one-pagers | [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md) |
| Hand APK / TestFlight to 1–2 PD offices or friendly counsel | Phase 5–6 |
| Public announce with “how to get the app” | Invite link or email `pd@` |

---

## Money & ops after launch

| Topic | Practice |
|---|---|
| Pricing | $9 / generation after free first; PDs unlimited when whitelisted |
| Refunds | Decide Stripe refund policy; mirror in ToS if needed |
| Support | Who answers `pd@` / payment failures / “APK won’t install” |
| Monitoring | Cloudflare analytics; Stripe dashboard; Worker logs (`wrangler tail`); Expo build history |
| Backups | R2 versioning optional; Pulumi state in `ctf-pulumi-state` |
| App updates | New EAS build (OTA not set up yet) — plan rebuild cadence for soft-launch cohort |
| Incidents | Rotate ClawQL key / Google client if leaked; never commit `.dev.vars` or Play service account JSON |

---

## Suggested sequence (checklist)

### A. Business (can parallel with tech)

- [ ] Entity decision (sole prop vs LLC) + formation if LLC  
- [ ] EIN  
- [ ] Business bank account  
- [ ] Stripe account + KYC (test mode)  
- [ ] ClawQL payments linked to Stripe  
- [ ] Counsel skim of `/terms.html` before live charges  
- [ ] Mailboxes: `pd@` (+ optional sponsor/support)  
- [ ] Expo account (free)  
- [ ] Start Apple Developer enrollment early (lags) if you want iOS soon  

### B. Website platform

- [ ] Merge/finish Pulumi Actions (PR #12) or local `infra` apply  
- [ ] GitHub secrets/vars for R2 state + Cloudflare  
- [ ] Pulumi up → wrangler.toml bindings synced  
- [ ] Google OAuth web client + secret  
- [ ] ClawQL gateway secrets on Worker  
- [ ] `npm run deploy`  
- [ ] Custom domain routes  
- [ ] Health + auth + generate + checkout smoke  
- [ ] Flip Stripe to live when ready  

### C. App (shortly after B)

- [ ] `eas login` + `eas init` on your laptop  
- [ ] Preview env points at live `challengethefootage.com`  
- [ ] Android preview APK built + installed on your phone  
- [ ] Device smoke (record / sync / claim)  
- [ ] Share APK with 1–2 soft-launch testers  
- [ ] Apple + App Store Connect ready  
- [ ] iOS preview → TestFlight internal  
- [ ] Same smoke on iPhone  
- [ ] (Later) Play / App Store production submit  

### D. Announce

- [ ] Soft launch list (web + APK/TestFlight)  
- [ ] Public launch note + PD instructions + how to get the app  
- [ ] One-pagers for target conversations  

---

## Cost snapshot (order of magnitude)

| Item | Rough |
|---|---|
| LLC formation | State-dependent (often low hundreds + annual report) |
| Stripe | Processing fees on $9 charges; no CTF subscription required |
| Cloudflare | Free tier often enough early; R2/Workers usage scales with evidence |
| Google Cloud | OAuth free at this scale |
| ClawQL | Per your ClawQL plan (LLM + payments + anchor) |
| Expo / EAS | Free tier often enough for early preview builds; paid if you burn build minutes |
| Apple Developer | ~$99/yr — needed for TestFlight / App Store (not for Android sideload) |
| Google Play Console | One-time ~$25 when you want store listing (not for sideload) |

---

## One-line priority

**Form something Stripe will accept → link Stripe to ClawQL → deploy Worker → Google Sign-In → test $9 checkout → soft-launch web to PDs → same week: Expo Android APK → then iOS TestFlight.** Store listings wait; the app does not.
