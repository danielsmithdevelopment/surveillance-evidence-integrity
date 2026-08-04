# Agent readiness (isitagentready.com)

Checklist and deploy notes for making **challengethefootage.com** score well on [isitagentready.com](https://isitagentready.com).

## Live scan status (2026-08-04, re-checked)

| Site | Result |
|---|---|
| `challengethefootage.com` | **Cloudflare 530** — DNS/Worker origin not connected; scanner returns `siteError.httpStatus: 530` (not scorable until deploy) |
| `clawql.com` | Level **2 Bot-Aware** — next gate is Markdown negotiation (Level 3). Additional fails below Level 5 |
| `docs.clawql.com` | Level **5 Agent-Native** — reference implementation (only DNS-AID DNSSEC fail remains) |

### clawql.com failing checks (actionable)

| Check | Status | Fix (in ClawQL `website/`, not this repo) |
|---|---|---|
| `markdownNegotiation` | **fail** — blocks Level 3 | `Accept: text/markdown` → markdown body (`Vary: Accept`) |
| `linkHeaders` | fail | Emit docs-style `Link` headers (GitHub Pages cannot; need Worker/CF edge or migrate off static GH Pages) |
| `a2aAgentCard` | fail | Add `supportedInterfaces` (and `supported_interfaces`) to `/.well-known/agent-card.json` |
| `authMd` | fail | Publish site-local `/.well-known/oauth-authorization-server` **with** `agent_auth` (identity_types + methods) — not a bare Google metadata mirror |
| `dnsAid` | fail | Publish `_agents` SVCB/HTTPS records (+ DNSSEC for full credit) |

Neutrals (informational / non-commerce): Web Bot Auth, x402, MPP.

**No push access to `danielsmithdevelopment/ClawQL` from this agent** — those fixes need a ClawQL PR.

### docs.clawql.com

Passes essentially everything for Level 5. Remaining: DNS-AID present but DNSSEC not validated; Web Bot Auth / x402 / MPP neutral.

## Implemented in this package (`public/` + Worker + WebMCP)

Discoverability / bot control / content:

- `/robots.txt` — AI bot rules + Content Signals + Sitemap
- `/sitemap.xml`
- `/llms.txt`, `/llms-full.txt`, `/AGENTS.md`
- Markdown negotiation via Worker (`Accept: text/markdown` → `/index.md`, `/terms.md`, `/public-defenders.md`)
- Homepage `Link` headers (api-catalog, service-desc, agent-card, llms.txt, auth.md, oauth-as, …)
- Correct `Content-Type` overrides for well-known JSON / linkset / markdown

Protocol discovery:

- `/.well-known/api-catalog` (RFC 9727 linkset+json)
- `/openapi.json`
- `/.well-known/mcp/server-card.json`
- `/.well-known/agent-card.json` (with `supportedInterfaces`)
- `/.well-known/agent-skills/index.json` + skill doc
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server` (+ full `agent_auth`)
- `/.well-known/openid-configuration` (+ `agent_auth`)
- `/auth.md` (Auth.md flow + embedded `agent_auth`)
- **WebMCP** — `navigator.modelContext.registerTool` on the homepage (`ctf_list_vendors`, `ctf_get_openapi`, `ctf_navigate`)

Commerce (informational / light):

- `/.well-known/acp.json`
- `/.well-known/ucp`
- OpenAPI `POST /api/checkout` annotated with Stripe $9 via ClawQL

## Still required after deploy

Full runbook: [CLOUDFLARE-DEPLOY.md](./CLOUDFLARE-DEPLOY.md).

1. **Point DNS + Worker** so challengethefootage.com stops returning 530.
2. **Re-scan:** `POST https://isitagentready.com/api/scan` `{"url":"https://challengethefootage.com","siteType":"api"}`.
3. **DNS-AID (optional, advanced):** publish `_index._agents` / `_mcp._agents` SVCB/HTTPS records (enable DNSSEC for full credit).
4. **Web Bot Auth (informational):** `/.well-known/http-message-signatures-directory` if you send signed bot traffic.
5. **x402 / MPP:** only if you want HTTP-402 machine payments in addition to Stripe Checkout.

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
curl -s http://127.0.0.1:8787/.well-known/oauth-authorization-server | head
```
