# Agent readiness (isitagentready.com)

Checklist and deploy notes for making **challengethefootage.com** score well on [isitagentready.com](https://isitagentready.com).

## Live scan status (2026-08-04)

| Site | Result |
|---|---|
| `challengethefootage.com` | **Cloudflare 530** — DNS/Worker origin not connected yet; scanner cannot score |
| `clawql.com` | Level **2 Bot-Aware** — missing Link headers, Markdown negotiation, DNS-AID, auth.md agent_auth polish, A2A `supportedInterfaces` |
| `docs.clawql.com` | Level **5 Agent-Native** — reference implementation |

## Implemented in this package (`public/` + Worker)

Discoverability / bot control / content:

- `/robots.txt` — AI bot rules + Content Signals + Sitemap
- `/sitemap.xml`
- `/llms.txt`, `/llms-full.txt`, `/AGENTS.md`
- Markdown negotiation via Worker (`Accept: text/markdown` → `/index.md`, `/terms.md`, `/public-defenders.md`)
- Homepage `Link` headers (api-catalog, service-desc, agent-card, llms.txt, auth.md, …)

Protocol discovery:

- `/.well-known/api-catalog` (RFC 9727)
- `/openapi.json`
- `/.well-known/mcp/server-card.json`
- `/.well-known/agent-card.json` (with `supportedInterfaces`)
- `/.well-known/agent-skills/index.json` + skill doc
- `/.well-known/oauth-protected-resource`
- `/.well-known/openid-configuration` (+ `agent_auth` block)
- `/auth.md`

Commerce (informational / light):

- `/.well-known/acp.json`
- `/.well-known/ucp`
- OpenAPI `POST /api/checkout` annotated with `x-payment-info` (Stripe $9 via ClawQL)

## Still required after deploy

1. **Point DNS + Worker** so challengethefootage.com stops returning 530.
2. **Re-scan:** `POST https://isitagentready.com/api/scan` `{"url":"https://challengethefootage.com","siteType":"api"}`.
3. **DNS-AID (optional, advanced):** publish `_index._agents` / `_mcp._agents` SVCB/HTTPS records (enable DNSSEC for full credit). See Cloudflare DNS-AID docs.
4. **Web Bot Auth (informational):** `/.well-known/http-message-signatures-directory` if you send signed bot traffic.
5. **WebMCP (optional):** register tools via `navigator.modelContext.provideContext()` on the homepage for in-browser agent tools.
6. **x402 / MPP:** only if you want HTTP-402 machine payments in addition to Stripe Checkout.

## clawql.com gaps (separate from this site)

To move clawql.com toward docs.clawql.com Level 5:

- Emit the same `Link` header set docs uses
- Enable Markdown negotiation on key pages
- Fix A2A card `supportedInterfaces`
- Ensure `/auth.md` includes discoverable `agent_auth` metadata
- Add DNS-AID records + DNSSEC

## Validate locally

```bash
cd challenge-tool
npm run build
npx wrangler dev
# then:
curl -sI http://127.0.0.1:8787/ | grep -i link
curl -sH 'Accept: text/markdown' http://127.0.0.1:8787/ | head
curl -s http://127.0.0.1:8787/robots.txt | head
curl -s http://127.0.0.1:8787/.well-known/agent-card.json | head
```
