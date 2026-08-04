# Challenge the Footage — Agent instructions

> Evidence management + legal document templates for challenging surveillance camera / ALPR evidence.
> Not legal advice. Generated documents require attorney review.
> Users pay with Stripe (card). No crypto wallet.

## What this site is

- **Human UI:** https://challengethefootage.com/
- **Evidence:** https://challengethefootage.com/evidence.html — record + secure encounters
- **Public defenders:** free unlimited access — https://challengethefootage.com/public-defenders.html
- **Terms:** https://challengethefootage.com/terms.html
- **Product model:** https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/challenge-tool/PRODUCT.md
- **Open source:** https://github.com/danielsmithdevelopment/surveillance-evidence-integrity
- **Powered by:** ClawQL (https://clawql.com) for inference, memory, Stripe, and independent evidence anchoring (invisible to end users)

## Prefer Markdown

Send `Accept: text/markdown` on `/`, `/evidence.html`, `/terms.html`, or `/public-defenders.html` for machine-readable content.

## Key files for agents

- [/llms.txt](https://challengethefootage.com/llms.txt) — site map for LLMs
- [/openapi.json](https://challengethefootage.com/openapi.json) — HTTP API
- [/.well-known/api-catalog](https://challengethefootage.com/.well-known/api-catalog) — RFC 9727 catalog
- [/.well-known/mcp/server-card.json](https://challengethefootage.com/.well-known/mcp/server-card.json) — MCP discovery
- [/.well-known/agent-card.json](https://challengethefootage.com/.well-known/agent-card.json) — A2A card
- [/.well-known/agent-skills/index.json](https://challengethefootage.com/.well-known/agent-skills/index.json) — skills
- [/auth.md](https://challengethefootage.com/auth.md) — Google Sign-In / agent auth notes

## HTTP API (requires Google ID token)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/entitlement` | Free / paid / PD status |
| POST | `/api/checkout` | Stripe Checkout ($9) via ClawQL payments |
| POST | `/api/generate` | Generate FRE 901 / 702 / 4th Am / §1983 docs (`footageCategory`: fixed_surveillance \| body_worn \| cellphone) |
| GET | `/api/history` | Prior session previews |
| GET | `/api/session/:id` | Recall one generation session |
| POST | `/api/evidence/secure` | Secure a recording package to the user account |
| POST | `/api/evidence/secure-device` | Native record-first secure (returns claimCode) |
| POST | `/api/evidence/sync-lite` | Rural/2G: hashes + gzip transcript in one request |
| POST | `/api/evidence/safety-ping` | Dead-man / interrupt safety alert audit ping |
| POST | `/api/evidence/incident/create` | Create multi-device incident (multi-angle) |
| POST | `/api/evidence/incident/join` | Join incident by code |
| POST | `/api/evidence/incident/heartbeat` | Peer heartbeat (+ PEER_LOST detection) |
| POST | `/api/evidence/incident/signal` | Coordinated start/stop |
| GET | `/api/evidence/incident/:id` | Incident status |
| POST | `/api/evidence/claim` | Link a device session to the signed-in account |
| POST | `/api/evidence/upload-url` | Create Worker-proxied blob upload URL |
| PUT | `/api/evidence/object/:id/:type` | Upload transcript/audio/video bytes (→ R2 when configured) |
| GET | `/api/evidence/sessions` | List evidence for the signed-in user |
| GET | `/api/evidence/verify/:id` | Public verification status |

Authorization: `Bearer <Google ID token>` matching `GOOGLE_CLIENT_ID`.

Local testing (never production): `ALLOW_TEST_AUTH=true` accepts `Bearer test:<userId>:<email>`. See [TESTING.md](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/challenge-tool/TESTING.md).

## Do not

- Treat generated documents as filed legal work product
- Skip attorney review or ToS acceptance (`tosAccepted: true` required on `/api/generate`)
- Invent case facts; only use user-supplied and vendor-profile facts
- Ask end users for crypto wallets or Arweave keys — ClawQL handles anchoring
