# auth.md

You are an agent interacting with **Challenge the Footage** (challengethefootage.com).

**Resource server:** `https://challengethefootage.com/`  
**Authorization:** Google Sign-In ID tokens (OIDC). Humans use the GIS button; agents must obtain a Google ID token for the configured OAuth client.

```yaml
agent_auth:
  skill: https://challengethefootage.com/auth.md
  resource: https://challengethefootage.com/
  authorization_servers:
    - https://accounts.google.com
  protected_resource_metadata: https://challengethefootage.com/.well-known/oauth-protected-resource
  openid_configuration: https://challengethefootage.com/.well-known/openid-configuration
  scopes: [openid, email, profile]
  bearer_methods: [header]
```

## Step 1 — Discover

```http
GET /.well-known/oauth-protected-resource
GET /.well-known/openid-configuration
```

## Step 2 — Authenticate

1. Obtain a Google ID token whose `aud` matches this site's `GOOGLE_CLIENT_ID`.
2. Call APIs with:

```http
Authorization: Bearer <google_id_token>
```

## Step 3 — Entitlement then generate

```http
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

If entitlement returns `canGenerate: false`, call `POST /api/checkout` and complete Stripe Checkout ($9), then retry.

## Public defenders

Humans email `pd@challengethefootage.com`. Operators whitelist via Cloudflare KV `pd_whitelist:{email}`. Agents cannot self-whitelist.

## Anonymous / unauthenticated

Read-only discovery documents (`/llms.txt`, `/openapi.json`, `/.well-known/*`, Markdown negotiation on public pages) do not require auth. Document generation requires auth + ToS acceptance.
