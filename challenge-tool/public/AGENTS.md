# Challenge the Footage — Agent instructions

> Legal document templates for challenging surveillance camera / ALPR evidence.
> Not legal advice. Generated documents require attorney review.

## What this site is

- **Human UI:** https://challengethefootage.com/
- **Public defenders:** free unlimited access — https://challengethefootage.com/public-defenders.html
- **Terms:** https://challengethefootage.com/terms.html
- **Open source:** https://github.com/danielsmithdevelopment/surveillance-evidence-integrity
- **Powered by:** ClawQL (https://clawql.com) for inference, memory, and payments

## Prefer Markdown

Send `Accept: text/markdown` on `/`, `/terms.html`, or `/public-defenders.html` for machine-readable content.

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
| POST | `/api/generate` | Generate FRE 901 / 702 / 4th Am / §1983 docs |
| GET | `/api/history` | Prior session previews |
| GET | `/api/session/:id` | Recall one session |

Authorization: `Bearer <Google ID token>` matching `GOOGLE_CLIENT_ID`.

## Do not

- Treat generated documents as filed legal work product
- Skip attorney review or ToS acceptance (`tosAccepted: true` required on `/api/generate`)
- Invent case facts; only use user-supplied and vendor-profile facts
