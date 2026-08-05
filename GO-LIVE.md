# Challenge the Footage — Go-live plan

**Audience:** you (operator), not end users.  
**Goal:** take [challengethefootage.com](https://challengethefootage.com) from Cloudflare **530** → real traffic with Stripe, Google Sign-In, and PD free access.  
**Not legal / tax advice** — treat entity and compliance rows as a checklist to run past a lawyer/CPA in your state.

Related: [challenge-tool/CLOUDFLARE-DEPLOY.md](./challenge-tool/CLOUDFLARE-DEPLOY.md) · [infra/README.md](./infra/README.md) · [challenge-tool/PRODUCT.md](./challenge-tool/PRODUCT.md) · [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md)

---

## Current blockers

| Blocker | Why it matters |
|---|---|
| Worker not attached to DNS | Site returns **530**; nothing else is testable in prod |
| Stripe / ClawQL payments | `$9` checkout and paid entitlement |
| Google OAuth web client | Sign-in on `/` and `/evidence.html` |
| Business identity for Stripe | Stripe usually wants a legal entity or sole prop + bank + tax ID |

Ship **web first**. Native Android APK is phase 2 ([witness/FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md)).

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

## Phase 5 — Soft launch vs public launch

### Soft launch (recommended first)

- Live domain, Google, Stripe **test** or limited live  
- Share with a few PDs / friendly attorneys only  
- Collect: broken copy, wrong jurisdiction assumptions, checkout friction  
- Print [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md) for 1–2 council / PD conversations  

### Public launch

- Stripe **Live** mode  
- OAuth consent **In production**  
- Announce: site, GitHub standards, PD free path  
- Do **not** overclaim Witness native until Android preview exists  

### Explicit non-goals for first public week

- App Store / Play production listing  
- Enclave device keys / Siri / shake  
- Sponsor-a-generation automation  
- Attorney incident cross-ref UI  

---

## Phase 6 — After web is stable

| Item | Doc |
|---|---|
| Android EAS preview APK | [witness/FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md) |
| Point native at prod API | `EXPO_PUBLIC_CTF_API` / `EXPO_PUBLIC_CTF_WEB` |
| Whisper model on device | [witness/BUILD.md](./witness/BUILD.md) |
| Council / PD distribution | [outreach/ONE-PAGERS.md](./outreach/ONE-PAGERS.md) |

---

## Money & ops after launch

| Topic | Practice |
|---|---|
| Pricing | $9 / generation after free first; PDs unlimited when whitelisted |
| Refunds | Decide Stripe refund policy; mirror in ToS if needed |
| Support | Who answers `pd@` / payment failures |
| Monitoring | Cloudflare analytics; Stripe dashboard; Worker logs (`wrangler tail`) |
| Backups | R2 versioning optional; Pulumi state in `ctf-pulumi-state` |
| Incidents | Rotate ClawQL key / Google client if leaked; never commit `.dev.vars` |

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

### B. Platform

- [ ] Merge/finish Pulumi Actions (PR #12) or local `infra` apply  
- [ ] GitHub secrets/vars for R2 state + Cloudflare  
- [ ] Pulumi up → wrangler.toml bindings synced  
- [ ] Google OAuth web client + secret  
- [ ] ClawQL gateway secrets on Worker  
- [ ] `npm run deploy`  
- [ ] Custom domain routes  
- [ ] Health + auth + generate + checkout smoke  
- [ ] Flip Stripe to live when ready  

### C. Announce

- [ ] Soft launch list  
- [ ] Public launch note + PD instructions  
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
| Apple Developer | Only when you do iOS (~$99/yr) — not required for web or Android sideload |

---

## One-line priority

**Form something Stripe will accept → link Stripe to ClawQL → deploy Worker to the domain → Google Sign-In → test $9 checkout → soft launch to PDs.** Everything else waits.
