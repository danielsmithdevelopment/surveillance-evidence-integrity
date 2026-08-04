# challengethefootage.com

Cloudflare Worker + static frontend that generates four legal document templates for challenging surveillance evidence.

## Layout

```
challenge-tool/
├── frontend.jsx              # React UI (bundled into static/ for Pages)
├── worker.js                 # Auth, entitlement, Stripe checkout, generation
├── vendors.js                # Reference vendor profiles (also inlined in worker.js)
├── wrangler.toml             # Worker + KV + assets
├── terms-of-service.md       # Source for /terms
├── document-disclaimer.txt   # Disclaimer template (also built in worker)
└── static/                   # Deployed assets
    ├── index.html
    ├── app.js                # Compiled / CDN-ready frontend
    ├── styles.css
    ├── terms.html
    └── public-defenders.html
```

## API routes (Worker)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/checkout` | Google Bearer | Stripe Checkout via ClawQL payments |
| GET | `/api/entitlement` | Google Bearer | Free / paid / PD status |
| POST | `/api/generate` | Google Bearer | Generate all four documents |
| GET | `/api/history` | Google Bearer | Prior session previews |
| GET | `/api/session/:id` | Google Bearer | Recall one session |

Vendor profiles live **server-side in `worker.js`**. Update them there.

## Public defender whitelist

```bash
wrangler kv:key put --binding=RATE_LIMIT_KV "pd_whitelist:{email}" "true"
```

## Local development

```bash
cd challenge-tool
npx wrangler dev
```

Set secrets in `.dev.vars`:

```
GOOGLE_CLIENT_ID=...
CLAWQL_GATEWAY_URL=https://...
CLAWQL_API_KEY=...
```

## Deploy

```bash
npx wrangler deploy
```

Point `challengethefootage.com` (and `.org`) DNS to the Worker / Pages project.

## ToS acceptance

Frontend stores acceptance under localStorage key `surv_tos_v1`. Increment to `v2` if terms change materially.
