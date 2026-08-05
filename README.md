# Surveillance Evidence Integrity

Tools, legal standards, and open-source software for challenging surveillance camera evidence in court — and for building surveillance infrastructure that produces evidence courts can actually trust.

Built by [Daniel Smith](https://github.com/danielsmithdevelopment) · Powered by [ClawQL](https://clawql.com) · Live tool at [challengethefootage.com](https://challengethefootage.com)

---

## The problem

Surveillance camera footage is used to prosecute people every day. No major vendor — Flock Safety, Axon, Motorola Solutions, Genetec, Verkada — publicly documents the technical controls required to independently verify that footage is what it claims to be.

No hash computed at the camera before footage leaves the hardware. No Merkle-chained audit log. No external immutable anchor independent of vendor infrastructure. No mandatory case number enforcement on queries.

Without these controls, "this is what the camera recorded, unaltered" is a vendor assertion. It is not a mathematically provable fact. And the capability to alter surveillance footage without leaving forensic traces is commercially available — documented by Haaretz in 2022 based on internal records from Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak.

The industry also operates at a documented ~10% misidentification error rate. The Institute for Justice has documented at least 27 wrongful stops and detentions from ALPR errors since 2018, and at least 28 cases of officers using ALPR networks to track romantic interests.

This repository is the response to that.

---

## What's here

### For people facing charges or wrongful stops

**[challengethefootage.com](https://challengethefootage.com)** — One product for civilians and public defenders: **record** encounters, **secure** evidence (ClawQL handles independent verification behind the scenes — no crypto wallet), and **generate** four attorney-review legal templates (FRE 901, FRE 702, Fourth Amendment, § 1983) for **fixed/ALPR, body-worn** (including failure-to-record), **and cell phone** footage. Sign in with Google. Pay with Stripe. Free first generation; PDs unlimited.

Source: **[challenge-tool/](./challenge-tool/)** · **Product spec:** **[challenge-tool/PRODUCT.md](./challenge-tool/PRODUCT.md)** · Challenge-grade: **[challenge-tool/CHALLENGE-GRADE.md](./challenge-tool/CHALLENGE-GRADE.md)** · **How to challenge all three camera classes:** **[challenge-tool/FOOTAGE-CHALLENGE.md](./challenge-tool/FOOTAGE-CHALLENGE.md)** · **Production deploy (Cloudflare):** **[challenge-tool/CLOUDFLARE-DEPLOY.md](./challenge-tool/CLOUDFLARE-DEPLOY.md)** · Testing: **[challenge-tool/TESTING.md](./challenge-tool/TESTING.md)** · Evidence UI: `/evidence.html`

**[Witness](./witness/)** — Optional native (Expo) capture module for the same product: offline / 2G-first sync (transcript → audio → video), on-device Whisper when linked, personal-safety alerts, and optional **multi-device incident** capture (shared `incidentId`, coordinated start, `PEER_LOST`). Prefer the website for one-URL onboarding; keep native for higher-reliability field capture. Deep-links back to Challenge the Footage with `?witnessSession=`. Public verify: `GET /api/evidence/verify/{sessionId}`.

### For defense attorneys

**[PD one-pager](./outreach/ONE-PAGERS.md)** — Four vectors, BWC ratchet, cellphone path, free access.

**[Authentication Challenge Guide](./authentication-challenge-guide.md)** — Ten specific discovery requests, a motion in limine framework under FRE 901, how to use Flock's responses (or non-responses) to build the argument, and guidance on expert witnesses.

**[challengethefootage.com](https://challengethefootage.com)** — generates all four documents pre-populated with vendor-specific documented facts. Public defenders: email pd@challengethefootage.com for free unlimited access.

### For city councils and contracting authorities

**[One-pager (print-ready)](./outreach/ONE-PAGERS.md)** — Before you renew: authentication gap, accuracy, access, three contract clauses.

**[Model Contract Language](./model-contract-language.md)** — Clause-ready amendment language covering hash at capture, Merkle chaining, external immutable anchoring, mandatory access logging, prohibition on undetectable alteration integrations, independent audit rights, and non-compliance consequences.

### For state legislators

**[Model Legislation](./model-legislation.md)** — Draft statutory language establishing minimum cryptographic integrity standards as a prerequisite for surveillance footage admissibility in criminal proceedings. Includes findings, definitions, operative requirements, transition provisions, and drafting notes.

### For surveillance camera vendors

**[For Vendors](./FOR-VENDORS.md)** — The technical standards required to sign the model contract language and win the next procurement cycle. The first vendor to meet these standards owns every contract renewal where a city attorney has read the Institute for Justice's litigation. Reference implementation: [clawql-surveillance](https://docs.clawql.com/surveillance).

### Technical reference

**[Technical Standards](./technical-standards.md)** — The full six-layer integrity architecture: hash at capture within camera hardware, Merkle chaining into WORM storage, external Arweave anchoring, append-only audit logging, file integrity monitoring, and supply chain integrity. Written for both security engineers and lawyers.

---

## How everything connects

```
A person gets pulled over
        |
        v
[Witness / Evidence capture activates]
   Records video + audio + on-device transcript
   Hashes each artifact (SHA-256); Merkle root on Worker
   Uploads in priority order (transcript → audio → video)
   ClawQL anchors behind the scenes when online
        |
        v
[Encounter ends]
        |
        +-- If footage is used in prosecution:
        |       challengethefootage.com generates:
        |         · FRE 901 motion (no chain of custody)
        |         · FRE 702 motion (~10% error rate)
        |         · 4th Amendment motion (access abuse)
        |         · Section 1983 demand letter (damages)
        |
        +-- If city is renewing surveillance contract:
        |       model-contract-language.md goes to city attorney
        |
        +-- If state is considering legislation:
                model-legislation.md goes to legislative staff
```

The Witness recording and the police body camera or ALPR footage exist in the same cryptographic framework. If both are anchored, discrepancies between them are mathematically detectable. If only the civilian recording is anchored and the police footage is not, the authenticated record is the civilian's.

---

## The legal framework

**FRE 901 — Authentication**
Proponents of surveillance footage must demonstrate the system producing it is reliable and produces accurate results (FRE 901(b)(9)). No major vendor can currently provide the cryptographic proof this requires when specifically challenged.

**FRE 702 — Reliability (Daubert)**
AI-generated identification evidence is subject to reliability scrutiny. A documented ~10% error rate does not meet the standard for evidence used to initiate stops, detentions, and arrests. The appropriate floor is 0.1% or better, independently certified.

**Fourth Amendment — Unauthorized access**
ALPR queries without documented case numbers and legitimate law enforcement purpose are constitutionally suspect. When 84% of queries in FOIA-derived audit logs carry no case number, and the documented pattern of officer abuse runs to at least 28 cases, a search without documentation cannot be distinguished from personal misuse.

**42 U.S.C. § 1983 — Civil damages**
Wrongful stops, detentions at gunpoint, and arrests based on misidentification constitute Fourth Amendment violations actionable under Section 1983. Settlements range from $10,000–$75,000 for brief detentions to $100,000–$500,000+ for prolonged detention or physical harm.

---

## The technical standard

The architecture that makes footage independently verifiable is documented in [technical-standards.md](./technical-standards.md) and implemented in [ClawQL's security framework](https://docs.clawql.com/security/best-practices).

The minimum standard for surveillance footage used as criminal evidence:

| Control | Requirement | Industry status |
|---|---|---|
| Hash at capture | SHA-256 within camera HSE before network transmission | Not publicly documented by any major vendor |
| Merkle chaining | Continuous chain in WORM storage | Not publicly documented by any major vendor |
| External anchoring | Merkle roots on Arweave or equivalent, hourly | Not publicly documented by any major vendor |
| Audit logging | All queries logged regardless of case number | Not implemented by any major vendor |
| Access enforcement | Queries without case numbers blocked, not flagged | Not implemented by any major vendor |
| Accuracy certification | ≤0.1% error rate, independently certified annually | Not certified by any major vendor |

---

## Contributing

Pull requests, issues, and forks are welcome across all parts of this repository.

Areas where contributions are most useful:

- **State-specific model legislation** — the current draft is written for federal proceedings; state variations are needed
- **Case law citations** — the authentication challenge guide needs jurisdiction-specific precedent
- **Vendor documentation updates** — if a vendor publishes new technical documentation about integrity controls, open an issue or PR
- **Witness app** — shake / Siri / Assistant activation, enclave device keys, attorney incident cross-ref UI
- **Translations** — Spanish translation of the council letter and Witness app UI

---

## Deployment

### challengethefootage.com (the web tool)

**One Cloudflare Worker** serves the UI (`static/`) and `/api/*` — not a separate Pages + Worker split.

- Infra (KV / R2 / routes): **[infra/](./infra/)** (Pulumi)  
- Deploy runbook: **[challenge-tool/CLOUDFLARE-DEPLOY.md](./challenge-tool/CLOUDFLARE-DEPLOY.md)**  
- Develop notes: [challenge-tool/README.md](./challenge-tool/README.md)

### Witness (the native companion)

See [witness/README.md](./witness/README.md), [witness/FIRST-NATIVE-DEPLOY.md](./witness/FIRST-NATIVE-DEPLOY.md), and [witness/NATIVE.md](./witness/NATIVE.md). Expo / React Native → same CTF Worker evidence APIs (legacy `witness/worker/` is deprecated).

Both can be self-hosted. ClawQL is optional for LLM docs + Arweave-class anchoring; users never need a crypto wallet.

---

## Public defender access

Public defenders and public defender offices have free unlimited access to challengethefootage.com.

Email **pd@challengethefootage.com** from your office email address. Access is activated within one business day.

This project exists to help people who are up against well-funded surveillance infrastructure with limited resources to fight back. Public defenders are on the front line of that fight.

---

## Sponsor a generation

Law firms, organizations, and individuals can sponsor generations for defendants who cannot afford the $9 fee. Sponsored generations are distributed through the public defender access pool.

Contact **sponsor@challengethefootage.com** for bulk sponsorship arrangements.

---

## Press and research

If you are a journalist, researcher, or civil liberties organization working on surveillance accountability, feel free to use the documentation and data in this repository. Attribution appreciated but not required.

Key sources underlying the factual claims in this project:

- [haveibeenflocked.com](https://haveibeenflocked.com) — FOIA-derived Flock Safety audit logs
- Institute for Justice Plate Privacy Project — ALPR error and abuse documentation
- Haaretz, 2022 — Toka internal documents (footage alteration capability)
- DHS SAVER ALPR Market Survey Report, June 2025 — industry error rate acknowledgment
- EFF — ALPR accuracy and misuse reporting
- 404 Media — Flock officer stalking case reporting

---

## Legal notice

Documents generated by challengethefootage.com and templates in this repository are starting points for attorney review, not legal advice. No attorney-client relationship is created by using any tool in this repository. Have every document reviewed by a licensed attorney in your jurisdiction before filing, submitting, or sending it.

Recording laws vary by state. In two-party or all-party consent states, notifying the officer that you are recording may be required. Consult an attorney in your jurisdiction before relying on Witness recordings in legal proceedings.

---

## Author

[Daniel Smith](https://danielsmithdevelopment.com) — architect of the [ClawQL](https://clawql.com) agentic AI security framework, which provides the Merkle-chaining, WORM audit, and Arweave anchoring infrastructure that powers this project.

[PragmaticVectors](https://pragmaticvectors.com) — technical writing where the security architecture underlying this work is documented in depth.

X: [@danielsmithdev](https://x.com/danielsmithdev) · LinkedIn: [danielsmithdev](https://linkedin.com/in/danielsmithdev)
