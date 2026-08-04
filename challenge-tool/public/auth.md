# auth.md

You are an agent. **Challenge the Footage** supports agentic discovery and authenticated document generation. Follow these steps in order.

**Resource server:** `https://challengethefootage.com/`  
**Authorization server:** Google Sign-In / OIDC (`https://accounts.google.com`) with site-local discovery metadata that includes `agent_auth`.

## Step 1 — Discover

### 1a. Protected Resource Metadata

```http
GET /.well-known/oauth-protected-resource
```

Returns RFC 9728 metadata: `resource`, `authorization_servers`, `scopes_supported`, and `bearer_methods_supported`.

### 1b. Authorization Server metadata

```http
GET /.well-known/oauth-authorization-server
GET /.well-known/openid-configuration
```

Includes standard OAuth / OIDC fields plus an `agent_auth` block:

```json
{
  "agent_auth": {
    "skill": "https://challengethefootage.com/auth.md",
    "register_uri": "https://challengethefootage.com/",
    "identity_types_supported": ["identity_assertion", "anonymous"],
    "identity_assertion": {
      "assertion_types_supported": [
        "urn:ietf:params:oauth:token-type:id-jag",
        "verified_email"
      ],
      "credential_types_supported": ["bearer"]
    },
    "anonymous": {
      "credential_types_supported": ["bearer"]
    },
    "methods": [
      {
        "type": "identity_assertion",
        "description": "Google Sign-In ID token as Authorization: Bearer."
      },
      {
        "type": "anonymous",
        "description": "Read-only discovery documents; no generation."
      }
    ]
  }
}
```

## Step 2 — Pick a method

1. **identity_assertion** — obtain a Google ID token (GIS / OIDC) whose `aud` matches this site's `GOOGLE_CLIENT_ID`.
2. **anonymous** — fetch public discovery only (`/llms.txt`, `/openapi.json`, `/.well-known/*`, Markdown negotiation).

## Step 3 — Call protected APIs

```http
Authorization: Bearer <google_id_token>
GET /api/entitlement
POST /api/generate
Content-Type: application/json

{
  "tosAccepted": true,
  "vendor": "flock",
  "caseNumber": "...",
  "defendant": "...",
  "court": "...",
  "jurisdiction": "...",
  "additionalFacts": "..."
}
```

If entitlement returns `canGenerate: false`, call `POST /api/checkout` (Stripe $9 via ClawQL), complete Checkout, then retry.

## Public defenders

Humans email `pd@challengethefootage.com`. Operators whitelist via Cloudflare KV `pd_whitelist:{email}`. Agents cannot self-whitelist.

## Related discovery

- MCP server card: `https://challengethefootage.com/.well-known/mcp/server-card.json`
- Agent card (A2A): `https://challengethefootage.com/.well-known/agent-card.json`
- OpenAPI: `https://challengethefootage.com/openapi.json`
- Skills: `https://challengethefootage.com/.well-known/agent-skills/index.json`
