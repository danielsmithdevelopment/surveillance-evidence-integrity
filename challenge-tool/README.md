# challengethefootage.com

Web tool that generates four legal document templates for challenging surveillance camera evidence:

1. **Motion in limine** — FRE 901 authentication
2. **Daubert motion** — FRE 702 accuracy / reliability
3. **Fourth Amendment suppression** — access abuse / undocumented queries
4. **Section 1983 demand letter** — civil damages

Free first generation per account. Public defenders: free unlimited access (email pd@challengethefootage.com). Additional generations: $9 via Stripe (clawql-payments).

## Layout

```
challenge-tool/
├── src/                      # React + Tailwind UI
│   ├── App.jsx               # Generator
│   ├── TermsPage.jsx
│   ├── PublicDefendersPage.jsx
│   └── index.css             # Tailwind theme
├── index.html                # Vite entries
├── terms.html
├── public-defenders.html
├── worker.js                 # Auth, entitlement, payment, generation
├── vendors.js                # Reference vendor profiles (also inlined in worker.js)
├── wrangler.toml
├── terms-of-service.md
├── document-disclaimer.txt
└── static/                   # vite build output (served by Worker assets)
```

## Develop

```bash
cd challenge-tool
npm install
npm run dev          # Vite UI on :5173 (proxies /api → :8787)
npm run worker       # build + wrangler dev (UI + API together)
```

Set secrets in `.dev.vars` for the Worker:

```
GOOGLE_CLIENT_ID=...
CLAWQL_GATEWAY_URL=https://...
CLAWQL_API_KEY=...
```

Inject `window.GOOGLE_CLIENT_ID` at deploy (HTML rewrite or Pages env) so Google Sign-In renders.

## Build & deploy

```bash
npm run build        # writes to static/
npm run deploy       # build + wrangler deploy
```

Vendor profiles live **server-side in `worker.js`**. Update them there.

## Public defender whitelist

```bash
wrangler kv:key put --binding=RATE_LIMIT_KV "pd_whitelist:{email}" "true"
```

## ToS acceptance

Frontend stores acceptance under localStorage key `surv_tos_v1`. Increment to `v2` if terms change materially.
