# Production deploy — Cloudflare Workers

Ship **challengethefootage.com** as one Worker: static UI (`static/`) + `/api/*` in `worker.js`.

Today the domain returns **Cloudflare 530** until a Worker is attached. This guide gets you from empty Cloudflare account → live site with Google Sign-In, Stripe (via ClawQL), evidence storage, and PD whitelist.

Native Android/iOS is separate — see [../witness/FIRST-NATIVE-DEPLOY.md](../witness/FIRST-NATIVE-DEPLOY.md). Deploy this Worker **before** expecting Witness sync/claim to hit production.

---

## What you are deploying

```
Browser / Witness app
  → Cloudflare Worker  (challenge-the-footage)
       ├── ASSETS        → Vite build in static/
       ├── RATE_LIMIT_KV → entitlements, evidence metadata, incidents, PD whitelist
       ├── R2 (optional) → transcript / audio / video bytes
       └── ClawQL gateway (secrets) → docs LLM, Stripe checkout, evidence anchor
```

| Piece | Cloudflare product |
|---|---|
| Site + API | Workers (+ Workers Static Assets) |
| Sessions / free-gen counters / evidence index | Workers KV |
| Media blobs | R2 |
| DNS + TLS for `challengethefootage.com` | Cloudflare DNS (zone on Cloudflare) |

---

## What you need

| Item | Notes |
|---|---|
| Cloudflare account | Free plan is enough to start |
| Domain on Cloudflare DNS | `challengethefootage.com` (or temporary `*.workers.dev`) |
| Node 20+ | Local machine for `npm run deploy` |
| Wrangler logged in | `npx wrangler login` |
| Google Cloud OAuth client | Web application type — see § Google Sign-In |
| ClawQL gateway URL + API key | Docs generation, Stripe checkout, evidence anchor |
| Stripe via ClawQL | Card payments — no Stripe keys in this Worker |

---

## 0. One-time: login + clone

```bash
git clone https://github.com/danielsmithdevelopment/surveillance-evidence-integrity.git
cd surveillance-evidence-integrity/challenge-tool
git checkout main
npm install
npx wrangler login
```

Confirm the account:

```bash
npx wrangler whoami
```

---

## 1. Create KV namespace

```bash
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create RATE_LIMIT_KV --preview
```

Copy the two IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<production id>"
preview_id = "<preview id>"
```

---

## 2. Create R2 bucket (recommended for evidence)

```bash
npx wrangler r2 bucket create ctf-evidence
# optional separate preview bucket:
npx wrangler r2 bucket create ctf-evidence-preview
```

Uncomment (and adjust names) in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "EVIDENCE_BUCKET"
bucket_name = "ctf-evidence"
preview_bucket_name = "ctf-evidence-preview"
```

**Prefer the R2 binding** in production. The `R2_*` secrets + S3-style presign in `r2.js` are a fallback when the binding is absent.

If you skip R2 for a first ship, evidence **metadata** still works in KV; large media uploads will fail or stay pending until storage is configured.

---

## 3. Set production secrets

Never put these in git. Never set `ALLOW_TEST_AUTH` in production.

```bash
cd challenge-tool

npx wrangler secret put GOOGLE_CLIENT_ID
# paste the OAuth Web client ID (….apps.googleusercontent.com)

npx wrangler secret put CLAWQL_GATEWAY_URL
# e.g. https://docs.clawql.com   (or your gateway host — no trailing slash issues; paths are appended)

npx wrangler secret put CLAWQL_API_KEY
```

Optional if you use S3-compatible R2 API instead of the binding:

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET_NAME
```

### Production vars (plain, not secret)

In `wrangler.toml` under `[vars]` keep:

```toml
TOOL_NAME = "Challenge the Footage"
```

Do **not** set:

- `ALLOW_TEST_AUTH` — would accept `Bearer test:…` from anyone
- `GENERATION_MODE=offline` — production should use the ClawQL gateway when keys are present (omit the var, or set `GENERATION_MODE=gateway`)

`GOOGLE_CLIENT_ID` is also injected into HTML responses by the Worker so Google Identity Services can run in the browser. You only need the secret — do not hardcode the client ID into `static/`.

---

## 4. Google Sign-In (OAuth client)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials  
2. Create **OAuth client ID** → application type **Web application**  
3. **Authorized JavaScript origins**
   - `https://challengethefootage.com`
   - `https://www.challengethefootage.com` (if you use www)
   - Temporary: `https://challenge-the-footage.<your-subdomain>.workers.dev`
4. **Authorized redirect URIs** — GIS button flow often needs none; if you add redirect-based flows later, include the same origins  
5. Copy the client ID into `wrangler secret put GOOGLE_CLIENT_ID`

OAuth consent screen: External (or Internal for workspace-only dogfood). Add test users while the app is in “Testing”.

---

## 5. First deploy (workers.dev)

```bash
cd challenge-tool
npm run deploy
# = npm run build && wrangler deploy
```

Wrangler prints a URL like:

`https://challenge-the-footage.<account>.workers.dev`

Smoke:

```bash
curl -sS https://challenge-the-footage.<account>.workers.dev/api/health
# expect: {"ok":true,"service":"challenge-the-footage",...,"testAuthEnabled":false}
```

Open the URL in a browser:

- [ ] Homepage loads (no 530)
- [ ] Google button appears (not “set GOOGLE_CLIENT_ID”)
- [ ] Sign in → entitlement strip shows
- [ ] Generate once (free first gen) for fixed / body-worn / cellphone
- [ ] `/evidence.html` sign-in works

If health shows `"testAuthEnabled":true`, dig for a leftover var/secret and remove it.

---

## 6. Attach custom domain

### A. Zone already on Cloudflare

Workers → `challenge-the-footage` → **Settings** → **Domains & Routes** → **Add** → `challengethefootage.com` (and `www` if needed).

Or in `wrangler.toml` (then redeploy):

```toml
routes = [
  { pattern = "challengethefootage.com/*", zone_name = "challengethefootage.com" },
  { pattern = "www.challengethefootage.com/*", zone_name = "challengethefootage.com" }
]
```

### B. DNS still elsewhere

1. Add site in Cloudflare → change nameservers at the registrar  
2. Wait for active zone  
3. Attach the Worker route as above  

TLS is automatic once the Worker route is on a Cloudflare zone.

Update Google OAuth origins to the production hostname if you only added `workers.dev` earlier.

---

## 7. Public defender whitelist

After KV is bound:

```bash
npx wrangler kv key put --binding=RATE_LIMIT_KV "pd_whitelist:attorney@county.gov" "true"
```

They sign in with that Google email → unlimited generations (no Stripe).

---

## 8. Payments + generation (ClawQL)

With `CLAWQL_GATEWAY_URL` + `CLAWQL_API_KEY` set:

| Call | Gateway path (Worker) |
|---|---|
| Entitlement / paid packs | `GET /payments/entitlement/:userId` |
| $9 Checkout | `POST /payments/stripe/checkout` |
| Doc generation | ClawQL chat (when not offline) |
| Evidence anchor | `POST /surveillance/witness/anchor` |

Verify with a **Stripe test card** through the live Checkout URL once (ClawQL/Stripe test mode). Confirm success returns to `https://challengethefootage.com/?payment=success` and a second generation is allowed.

If ClawQL secrets are missing, the Worker falls back to **offline** templates — fine for CI, not the production LLM path.

---

## 9. Post-deploy checklist

Copy from [TESTING.md](./TESTING.md) production section:

- [ ] `https://challengethefootage.com/api/health` → `ok: true`, `testAuthEnabled: false`
- [ ] Google Sign-In on `/` and `/evidence.html`
- [ ] Free first generation; second hits paywall → Stripe Checkout
- [ ] Body-worn + recording status `missing` produces Stage‑1 failure-to-record language
- [ ] Evidence secure (web) creates a session; R2/object upload when configured
- [ ] PD whitelist email gets `isPD` / unlimited
- [ ] `ALLOW_TEST_AUTH` unset
- [ ] Manual keyboard / screen-reader pass (README accessibility policy)
- [ ] Re-scan agent readiness: [AGENT-READY.md](./AGENT-READY.md) (`isitagentready.com`)

Witness native builds should use:

```bash
EXPO_PUBLIC_CTF_API=https://challengethefootage.com
EXPO_PUBLIC_CTF_WEB=https://challengethefootage.com
```

---

## 10. Redeploys

```bash
cd challenge-tool
git pull origin main
npm install
npm run ci          # optional but recommended before prod
npm run deploy
```

Secrets persist across deploys. Changing `wrangler.toml` bindings (KV/R2/routes) requires another `wrangler deploy`.

---

## 11. Rollback

```bash
npx wrangler deployments list
npx wrangler rollback
```

Or redeploy a known-good git SHA:

```bash
git checkout <sha>
npm run deploy
git checkout main
```

---

## Security hard rules

| Do | Do not |
|---|---|
| `wrangler secret put` for keys | Commit `.dev.vars` or secrets |
| Leave `ALLOW_TEST_AUTH` unset in prod | Enable test bearer tokens on the live hostname |
| Use ClawQL for Stripe | Put raw Stripe secret keys in this Worker |
| Prefer R2 binding for blobs | Expose R2 credentials to the browser |
| Confirm `testAuthEnabled: false` on `/api/health` | Ship with `GENERATION_MODE=offline` as the long-term prod mode |

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| **530 / host error** | DNS or Worker route not attached to the zone |
| “set `GOOGLE_CLIENT_ID`” in UI | Secret missing, or HTML not going through Worker (`run_worker_first` must stay true) |
| Google “origin not allowed” | Add exact `https://…` origin in Google Cloud credentials |
| Auth 401 after sign-in | Client ID mismatch between GIS button and Worker secret |
| Checkout 500 | ClawQL payments not configured / Stripe not linked on gateway |
| Offline-looking docs in prod | Missing `CLAWQL_*` secrets → Worker uses offline templates |
| Evidence upload fails | No `EVIDENCE_BUCKET` and no `R2_*` secrets |
| PD still paywalled | KV key must be exact `pd_whitelist:{email}` lowercase match to Google email |

Local parity (not production):

```bash
cp .dev.vars.example .dev.vars   # ALLOW_TEST_AUTH + GENERATION_MODE=offline only here
npm run worker                   # http://127.0.0.1:8787
```

---

## Related docs

- [README.md](./README.md) — develop + quality gates  
- [PRODUCT.md](./PRODUCT.md) — product model  
- [TESTING.md](./TESTING.md) — CI + production checklist  
- [AGENT-READY.md](./AGENT-READY.md) — post-deploy agent scan  
- [../witness/FIRST-NATIVE-DEPLOY.md](../witness/FIRST-NATIVE-DEPLOY.md) — Android APK after the Worker is live  
