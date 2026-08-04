# Challenge the Footage

Generate legal document templates that challenge surveillance camera and ALPR evidence.

## When to use

- A defendant or attorney needs FRE 901 / FRE 702 / Fourth Amendment / §1983 starting drafts
- Vendor is Flock, Axon, Motorola/Vigilant, Genetec, Verkada, or custom
- You have case caption details and a short factual narrative

## Steps

1. Read https://challengethefootage.com/AGENTS.md and https://challengethefootage.com/auth.md
2. Authenticate with a Google ID token (`Authorization: Bearer …`)
3. `GET /api/entitlement` — if `canGenerate` is false, `POST /api/checkout` ($9)
4. `POST /api/generate` with `tosAccepted: true` and case fields
5. Return the four Markdown documents to a human attorney for review before filing

## Constraints

- Not legal advice; do not claim attorney work product
- Do not invent facts beyond user input + documented vendor profiles
- Public defender free access is human-verified via pd@challengethefootage.com
