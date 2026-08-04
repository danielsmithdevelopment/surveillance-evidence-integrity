---
canonical: https://clawql.com/industries/surveillance/
meta-application-name: ClawQL
meta-author: ClawQL
meta-creator: ClawQL
meta-description: ClawQL's surveillance vertical (clawql-surveillance) provides cryptographic chain of custody for camera footage — hardware attestation at capture, Merkle-chained audit logs, external Arweave anchoring, and mandatory access enforcement — so footage can be independently authenticated as criminal evidence.
meta-og:description: ClawQL's surveillance vertical (clawql-surveillance) provides cryptographic chain of custody for camera footage — hardware attestation at capture, Merkle-chained audit logs, external Arweave anchoring, and mandatory access enforcement — so footage can be independently authenticated as criminal evidence.
meta-og:title: Surveillance · ClawQL
meta-og:type: website
meta-og:url: https://clawql.com/industries/surveillance/
meta-robots: index, follow
meta-theme-color: #0f1419
title: Surveillance · ClawQL
---

Cryptographic chain of custody · independently verifiable · mandatory access enforcement

# The audit layer that makes camera footage trustworthy as evidence.

ClawQL's surveillance vertical (clawql-surveillance) composes hardware attestation receipt, Merkle-chained WORM audit logging, external Arweave anchoring, and mandatory case number enforcement into a single audit layer for surveillance camera vendors — so footage can be independently authenticated under FRE 901 and equivalent state rules, officer access is permanently and immutably recorded, and the chain of custody survives independent scrutiny in court.

[Book a demo](https://clawql.com/signup/) [Technical docs](https://docs.clawql.com/surveillance/clawql-surveillance)

clawql-surveillance is infrastructure for camera vendors and integrators. It does not operate cameras, collect footage, or provide law enforcement services. The audit architecture described here is designed to protect defendants, officers, and contracting agencies equally — the same controls that authenticate footage also make unauthorized access impossible to hide.

---

Overview

## ClawQL for surveillance camera vendors

Courts are beginning to ask a question that no major surveillance camera vendor can currently answer: how do you know this footage is what the camera originally recorded, unaltered?

The authentication gap is structural. No major vendor publicly documents cryptographic hashing of footage within camera hardware at capture, Merkle-chained audit logs, external immutable anchoring of chain of custody records, or mandatory case number enforcement on queries. This means footage authentication depends on vendor assertion rather than independently verifiable mathematical proof — a standard that FRE 901(b)(9) and Daubert scrutiny are beginning to expose.

The practical consequences are compounding. Active federal litigation is establishing authentication standards at the circuit level. Public defenders equipped with Daubert motions citing the industry's documented ~10% misidentification error rate are challenging footage reliability in volume. Cities are writing cryptographic integrity requirements into new RFPs after reviewing the model contract language published at github.com/danielsmithdevelopment/surveillance-evidence-integrity. Contracts are being lost not on price or features but on the inability to answer a chain of custody question that the market is now asking.

clawql-surveillance gives camera vendors the audit infrastructure to answer that question — and to sign the contract language that wins the next procurement cycle.

The framing that works: body cameras became a trust multiplier for law enforcement not because they surveilled officers, but because they made evidence trustworthy and protected good officers from false accusations. The same logic applies here. Cryptographic chain of custody serves defendants who need to challenge unreliable evidence, officers who need their legitimate work to be unimpeachable in court, and agencies that need to demonstrate their surveillance programs meet the standards courts and cities are moving toward. The audit layer protects everyone except the people misusing access — and that is the point.

---

Industry context

## The gap the market is moving to close

The authentication problem is not theoretical. It is being litigated right now.

Active federal litigation has produced the first civil ALPR challenges to survive motions to dismiss, establishing that courts will hear authentication arguments about surveillance footage. Public defenders equipped with challenge tools are filing FRE 901 and FRE 702 motions in volume. The Institute for Justice has documented at least 27 cases of innocent people detained at gunpoint or jailed due to misidentification errors since 2018, and at least 28 cases of officers using ALPR networks to track personal interests — with the bulk of both categories happening since 2024.

Cities are responding. Dozens have canceled or declined to renew surveillance contracts. New RFPs are incorporating contract language requiring hash at capture, Merkle-chained audit logs, and external immutable anchoring. The procurement conversation has shifted from "does it work" to "can you prove it hasn't been tampered with and can you prove every query had a legitimate purpose."

The vendors that can answer both questions own the next procurement cycle.

clawql-surveillance provides Sections 2 through 6 of the model contract language out of the box — Merkle chaining, external anchoring, mandatory access logging, prohibition on undetectable alteration integrations, and independent audit rights. Section 1 — hash at capture within camera hardware — requires camera hardware integration; clawql-surveillance is designed to receive attestation proofs from camera HSEs and incorporate them into the chain at ingestion.

---

Who it's for

## Two audiences, one audit engine

Same Merkle-chained WORM audit infrastructure — positioned for camera vendors building compliant products and for cities and agencies that need independently verifiable chain of custody on footage already in the field.

**Camera vendors and integrators**

### Cryptographic chain of custody as a product differentiator.

The vendor that can sign the model contract language without negotiating out the integrity clauses wins every procurement where a city attorney has read the IJ litigation or seen a Daubert motion in their jurisdiction. clawql-surveillance provides the audit infrastructure; the camera hardware vendor provides the HSE for hash at capture.

| Layer | What it does | Who provides it |
|---|---|---|
| Camera hardware + HSE | Hash footage at capture, generate attestation proof | Camera vendor |
| clawql-surveillance | Receive attestation, build Merkle chain, anchor externally, enforce access | ClawQL |
| Contracting agency | Configure authorized users, set case number policy, receive audit access | Agency |
| Courts and defense | Independently verify chain via public Arweave transaction IDs | Any party |

**Cities and agencies**

### Independent verification of footage already in the field.

For agencies operating existing camera networks that do not yet meet these standards, clawql-surveillance provides the audit layer that can be retrofitted around existing infrastructure — providing Merkle-chained access logging, external anchoring, and mandatory case number enforcement even where hash at capture has not yet been implemented at the hardware level.

---

Challenges

## Problems clawql-surveillance solves

These are the specific gaps the clawql-surveillance vertical targets — on top of ClawQL Core WORM audit, Arweave anchoring, access enforcement, and the supply chain signing infrastructure from clawql-release.

### Footage authentication depends on vendor assertion

Without hash at capture and Merkle chaining, "this is what the camera recorded" is an assertion the proponent cannot independently verify. Courts are beginning to treat this as an FRE 901(b)(9) problem. clawql-surveillance receives hardware attestation proofs from camera HSEs, incorporates them into a Merkle chain from the moment of ingestion, and anchors Merkle roots to Arweave so any party can verify independently without vendor cooperation.

### Access logs can be cleaned up after unauthorized use

When audit logs are stored in mutable vendor infrastructure, unauthorized access — including the documented pattern of officers using ALPR networks to track personal interests — can be quietly addressed before it surfaces publicly. WORM storage and Merkle chaining make the audit log itself tamper-evident. An unauthorized query is a permanent record. A pattern of unauthorized queries is a permanent pattern. The log protects agencies and good officers by making the record unimpeachable in both directions.

### Case number requirements are optional and therefore meaningless

Across the industry, case number fields are typically optional or advisory. The documented result is that the majority of queries carry no case number — making unauthorized personal use structurally undetectable. clawql-surveillance blocks queries without valid case numbers at the system level. A search without a case number does not generate a result. It generates a permanent CASE_NUMBER_REJECTED audit event with the officer ID, timestamp, and agency.

### No vendor can currently demonstrate compliance with procurement requirements

The model contract language at github.com/danielsmithdevelopment/surveillance-evidence-integrity — written from the perspective of what courts, public defenders, and city attorneys are moving toward — requires capabilities no current vendor publicly documents. clawql-surveillance provides the infrastructure to meet those requirements and to generate a machine-readable compliance report against each contract section that vendors can provide in procurement conversations and courts can reference in authentication hearings.

### Accuracy certifications don't exist at meaningful standards

The industry operates at a documented ~10% misidentification error rate. No court has established an acceptable floor. The appropriate standard for evidence used to initiate stops, detentions, and arrests is 0.1% or better — two orders of magnitude below current documented performance. clawql-surveillance ingests independent third-party accuracy certification results, publishes them to Arweave alongside Merkle roots, and surfaces certification status in the compliance report and in footage export chain of custody documentation. Vendors who commission independent testing and meet the 0.1% standard can demonstrate it in court. Vendors who do not cannot.

---

Platform

## Shared ClawQL capabilities

Every vertical package composes these horizontal layers — security, audit, and supply chain integrity.

- WORM forensic audit — Merkle-chained, hash-linked, independently verifiable; same architecture as ClawQL's inference audit trail
- Arweave anchoring — external immutable anchoring of Merkle roots; publicly verifiable by any party with the transaction ID; under $1/day for an entire camera network
- Supply chain signing — Cosign-signed images, CycloneDX SBOM, startup hash verification via clawql-release; the audit infrastructure itself is verifiable
- Mandatory access enforcement — case number required on all queries; federal agency access logged with the same specificity as local agency access; unauthorized access blocked and permanently recorded
- Public verification API — no-auth endpoint for independent chain verification; designed for use by defense experts, courts, and journalists without vendor cooperation
- Hardware attestation receipt — accepts HSE attestation proofs from camera hardware and incorporates them into the Merkle chain at ingestion

---

Domain tools

## Tools from clawql-surveillance

Registered when `CLAWQL_SURVEILLANCE_ENABLED=1`:

`footage_ingest()`

Receive a footage segment with hardware attestation proof, verify the attestation, record the segment hash, and append to the Merkle chain.

`footage_verify()`

Verify a footage file against the Merkle chain and external Arweave anchor. Returns a machine-readable verification result suitable for court production.

`footage_query()`

Query footage with mandatory case number enforcement. Blocked queries generate a permanent CASE_NUMBER_REJECTED event.

`footage_export()`

Export footage with full chain of custody documentation — Merkle proof, Arweave transaction ID, attestation proof, and complete access history.

`audit_log_query()`

Query the access audit log by camera, time range, officer, agency, or case number. Returns tamper-evident results from the Merkle-chained log.

`merkle_verify()`

Verify Merkle chain integrity from any entry forward. Produces a verification report for court or procurement use.

`arweave_anchor_status()`

Check anchoring status, retrieve transaction IDs for specific time ranges, and verify published roots against the local chain.

`accuracy_report_ingest()`

Ingest third-party accuracy certification results. Published to Arweave alongside Merkle roots.

`contract_compliance_report()`

Generate a machine-readable compliance report against each section of the model contract language. Publishable to Arweave for procurement and court use.

`federal_access_log()`

Specialized logging for federal agency access events with mandatory agency identifier and authorization reference fields.

---

Audit events

## What goes into the permanent record

Every surveillance event appends a hash-chained entry to the WORM audit log. Entries cannot be modified or deleted after writing.

| Event | Trigger |
|---|---|
| `FOOTAGE_INGESTED` | New segment received and attestation verified |
| `FOOTAGE_VERIFIED` | Verification pass or fail against Merkle chain |
| `FOOTAGE_QUERY` | Search against footage or metadata — case number required |
| `FOOTAGE_EXPORT` | Footage exported to agency or court |
| `FOOTAGE_FEDERAL_ACCESS` | Federal agency access event |
| `CASE_NUMBER_REJECTED` | Query blocked — missing or invalid case number |
| `UNAUTHORIZED_ACCESS_BLOCKED` | Access attempt from unprovisioned agency or user |
| `ATTESTATION_FAILED` | Footage rejected — invalid HSE attestation proof |
| `MERKLE_ROOT_COMPUTED` | New Merkle root calculated |
| `ARWEAVE_ANCHOR_CONFIRMED` | Root published to Arweave, transaction ID recorded |
| `ACCURACY_REPORT_INGESTED` | New third-party certification result recorded |
| `CONTRACT_COMPLIANCE_VERIFIED` | Compliance report generated |

All events carry a `correlation_id` linking to the inference call store when AI-assisted processing is involved.

---

Use cases

## Why clawql-surveillance

### Procurement conversations vendors can win

The contract compliance report generates a section-by-section status against the model contract language. Vendors who meet the standards can produce it in procurement conversations. Vendors who do not can identify exactly which gaps to close. The report itself is published to Arweave — a permanent, independently verifiable record of compliance status at a specific point in time.

### Authentication hearings with independent verification

When a defense expert requests verification of footage at issue, `footage_verify()` returns a Merkle proof and Arweave transaction ID that the expert can independently validate against the public Arweave network without requesting anything from the vendor. The court gets mathematical proof, not vendor assertion.

### Unauthorized access that surfaces itself

When access logging is immutable and case numbers are mandatory, unauthorized personal use generates a permanent record: the officer ID, the query, the timestamp, and the CASE_NUMBER_REJECTED or FOOTAGE_QUERY event with no associated case. Pattern analysis across the audit log surfaces systematic misuse before it becomes a public scandal. Agencies that run regular audit queries know what their officers are doing with access. Those that do not are operating blind in a documented risk area.

### Accuracy certification that travels with footage

When footage is exported for court production, `footage_export()` includes the current accuracy certification status — error rate, certification date, testing organization, validity period, and Arweave transaction ID for the published certification. Defense counsel receives everything they need to assess the reliability of the identification system alongside the footage itself.

### Retrofitting existing deployments

For agencies operating camera networks that do not yet implement hash at capture at the hardware level, clawql-surveillance provides the audit layer for everything downstream — access logging, Merkle chaining, Arweave anchoring, and mandatory case number enforcement — while the hardware attestation layer matures. Partial compliance is documented in the compliance report; the gap is explicit rather than hidden.

---

Security and compliance

## Built for the standards courts are moving toward

Industry pages summarize platform capabilities — legal, compliance, and security teams should review [docs.clawql.com/security](https://docs.clawql.com/security) before production deployment.

- WORM Merkle audit trail — same architecture as ClawQL's inference and payment audit logs; independently verifiable; chain integrity verifiable by `clawql surveillance audit verify`
- External immutable anchoring — Arweave transaction IDs are permanent and publicly accessible without vendor cooperation; anchoring cost is under $1/day for most deployments
- Supply chain integrity — clawql-surveillance images are Cosign-signed with CycloneDX SBOM; startup hash verification via `clawql doctor --smoke`; the audit infrastructure's own provenance is verifiable
- Mandatory enforcement architecture — case number blocking and unauthorized agency blocking are structural controls, not policy recommendations; they cannot be disabled without a configuration change that itself generates an audit event
- Public verification endpoint — `GET /surveillance/verify/:arweave_tx_id` requires no authentication; designed for use by any party without vendor involvement
- Self-hosted option — keeps footage and audit logs on agency or vendor infrastructure; Arweave anchoring is the only external dependency required

---

Resources

## Related documentation

- [clawql-surveillance specification](https://docs.clawql.com/surveillance/clawql-surveillance)
- [Model contract language](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/model-contract-language.md)
- [Technical standards](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/technical-standards.md)
- [For vendors](https://github.com/danielsmithdevelopment/surveillance-evidence-integrity/blob/main/FOR-VENDORS.md)
- [challengethefootage.com](https://challengethefootage.com) — the public-facing tool that generates legal document templates for challenging surveillance footage; built on clawql-surveillance's audit architecture
- [WORM forensic audit reference](https://docs.clawql.com/security/audit-trail)
- [Immutable releases — Arweave](https://docs.clawql.com/getting-started/immutable-releases)
- [Modularization v2.1](https://docs.clawql.com/vision/modularization)

---

## Ready to demo ClawQL for surveillance?

Self-host the surveillance compose stack or contact us about vendor integration. The audit infrastructure is available today; hardware attestation integration is scoped per camera vendor.

[Book a demo](https://clawql.com/signup/) [Technical specification](https://docs.clawql.com/surveillance/clawql-surveillance)

clawql-surveillance provides audit infrastructure. It does not operate surveillance cameras or provide law enforcement services. Camera vendors integrate their hardware; agencies configure access policy; ClawQL provides the immutable record of what happened.
