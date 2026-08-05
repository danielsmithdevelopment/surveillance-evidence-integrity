# challengethefootage.com

One product for **evidence + legal document templates**.

1. Record a police encounter (`/evidence.html` or native Evidence app)
2. Secure evidence to the user’s account (ClawQL anchors independently — **no crypto wallet**)
3. Optional **multi-device incident** — several phones, one `incidentId`, coordinated start
4. Generate FRE 901 / 702 / Fourth Amendment / § 1983 templates for **fixed/ALPR, body-worn** (incl. failure-to-record), **or cell phone** footage
5. Pay with **Stripe** (card) when past the free generation; public defenders free

See [PRODUCT.md](./PRODUCT.md), [CHALLENGE-GRADE.md](./CHALLENGE-GRADE.md), and the full challenge guide [FOOTAGE-CHALLENGE.md](./FOOTAGE-CHALLENGE.md).

**Production (Cloudflare):** [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md) · [../infra/README.md](../infra/README.md) (Pulumi KV/R2)

Free first generation per account. Public defenders: free unlimited access (email pd@challengethefootage.com). Additional generations: $9 via Stripe (clawql-payments).

## Develop

```bash
cd challenge-tool
npm install
npm run dev          # Vite UI on :5173 (proxies /api → :8787)
npm run worker       # build + wrangler dev (UI + API together)
```

### Local generation without Google / ClawQL secrets

Copy `.dev.vars.example` → `.dev.vars` (gitignored). With `ALLOW_TEST_AUTH=true` and `GENERATION_MODE=offline`:

```bash
npm run worker
# other terminal:
npm run generate:sample
```

Sample docs land in `.artifacts/sample-generation/`. Test bearer format: `Authorization: Bearer test:<userId>:<email>`.

Never set `ALLOW_TEST_AUTH` in production.

## Quality gates (CI)

```bash
npm run format:check   # Prettier
npm run lint           # ESLint + jsx-a11y strict
npm test               # smoke + offline docs + evidence crypto/API
npm run test:a11y      # Playwright + axe WCAG 2.2 A/AA
npm run lighthouse     # Lighthouse CI (a11y 100, BP/SEO ≥90)
npm run ci             # all of the above
```

Full walkthrough: [TESTING.md](./TESTING.md). GitHub Actions: `.github/workflows/ci.yml`.

### Accessibility policy

Automated coverage:

- **eslint-plugin-jsx-a11y** `strict` on all React sources
- **@axe-core/playwright** with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` on `/`, ToS modal, `/terms.html`, `/public-defenders.html`
- **Lighthouse** accessibility category must score **1.0**; color-contrast audit must pass
- Skip link, landmarks, focus trap in ToS dialog, `prefers-reduced-motion`, labeled fields

Automated tools cannot prove full WCAG conformance. Before each release, manually verify:

1. Keyboard-only path through ToS → form → (mock) results tabs
2. Screen reader announcements for errors (`role="alert"`) and entitlement status
3. Zoom to 200% without loss of content or horizontal scrolling of primary UI
4. Windows High Contrast / forced-colors sanity check

### Lighthouse budgets

| Category | Gate |
|---|---|
| Accessibility | error if &lt; 1.0 |
| Best practices | error if &lt; 0.9 |
| SEO | error if &lt; 0.9 |
| Performance | warn if &lt; 0.85 |

## Layout

```
challenge-tool/
├── src/                 # React + Tailwind UI
├── test/                # node:test + Playwright + Lighthouse
├── evidence-crypto.js   # Shared SHA-256 / merkle helpers
├── worker.js            # Auth, entitlement, payment, generation, evidence
├── r2.js                # Optional R2 PUT signing
├── PRODUCT.md           # Current product specification (PRs #1–#9)
├── CLOUDFLARE-DEPLOY.md # Production Workers / DNS / secrets
├── ../infra/            # Pulumi: KV, R2, optional routes
├── TESTING.md           # How to run / what CI covers
├── eslint.config.js
├── lighthouserc.cjs
├── playwright.config.js
└── static/              # vite build output
```

Vendor profiles live **server-side in `worker.js`**. Update them there.

## Deploy

```bash
npm run deploy           # build + wrangler deploy
npm run infra:sync       # pull Pulumi KV/R2 ids into wrangler.toml (from ../infra)
```

Full production runbook (Pulumi + Wrangler): [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md) · [../infra/README.md](../infra/README.md).

## Public defender whitelist

```bash
npx wrangler kv key put --binding=RATE_LIMIT_KV "pd_whitelist:{email}" "true"
```

## ToS acceptance

Frontend stores acceptance under localStorage key `surv_tos_v1`. Increment to `v2` if terms change materially.

## Agent readiness (isitagentready.com)

See [AGENT-READY.md](./AGENT-READY.md). Static discovery files live in `public/` (copied into `static/` on build). The Worker adds `Link` headers and Markdown content negotiation.
