# For Surveillance Camera Vendors

This repository documents the technical standards that surveillance camera footage must meet to be reliably authenticated as criminal evidence under Federal Rule of Evidence 901 and equivalent state rules.

No major vendor currently meets these standards. That is a problem for vendors as much as it is for defendants and cities — because courts are beginning to ask the questions this documentation raises, and vendors who cannot answer them are losing contracts and having footage excluded.

This page explains what the standards require, what a vendor needs to build to meet them, and what winning the next generation of procurement looks like.

---

## The procurement shift happening now

Cities and counties that have read the Institute for Justice's litigation, seen public defenders file Daubert motions citing 10% error rates, or reviewed the model contract language in this repository are writing new procurement requirements. The model contract language published here — covering hash at capture, Merkle chaining, external immutable anchoring, mandatory case number enforcement, and prohibition on undetectable alteration integrations — is appearing in RFPs.

The first vendor that can sign that contract language without negotiating out every clause wins those procurements. The vendors that cannot sign it are exposed in every renewal conversation where a city attorney has done their homework.

This is not a distant regulatory risk. The Institute for Justice has active federal litigation in Norfolk, Virginia and San Jose, California. The San Jose case involves 474 cameras conducting approximately 15,000 searches per day. When that case produces published opinions on ALPR authentication standards, every jurisdiction in that circuit is affected.

---

## The five technical requirements

### Requirement 1: Hash at capture within camera hardware

**What it means:** A cryptographic hash of each footage segment must be computed inside the camera hardware — specifically within a hardware security element (HSE) or trusted execution environment (TEE) — before the footage is transmitted to any network or storage system outside the camera.

**Why it matters:** If the hash is computed after the footage leaves the camera, an attacker who can intercept the footage in transit can alter it and compute a new hash for the altered content. The hash at capture, computed inside the hardware, is the only control that closes this gap. Toka, an Israeli cyber firm documented by Haaretz in 2022, sells technology capable of altering surveillance footage without leaving forensic traces. This capability is commercially available to government clients. A vendor whose footage can be altered before the hash is computed cannot demonstrate that their footage is what the camera originally recorded.

**What to build:**
- Integrate an HSE (e.g., ARM TrustZone, dedicated secure element) into the camera hardware
- Hash each footage segment (recommended: 60 seconds or shorter) using SHA-256 or stronger
- Generate a Hardware Attestation report for each hash, signed by a key burned into the HSE at manufacture and not extractable by software
- Store the hash and attestation locally until transmission is confirmed

**The court standard:** Under FRE 901(b)(9), the proponent must show the system produces accurate results. Hash at capture with hardware attestation provides mathematical proof that a specific footage file matches what the camera originally recorded. Without it, authentication depends on vendor assertion.

---

### Requirement 2: Merkle-chained audit log in WORM storage

**What it means:** All footage hashes and all access events must be organized into a continuous Merkle chain stored in write-once, read-many (WORM) storage where entries can be appended but not modified or deleted.

**Why it matters:** A Merkle chain makes the integrity of the entire historical record mathematically verifiable. Any gap, deletion, or substitution in the chain is detectable by recomputing the hashes from any subsequent entry. WORM storage prevents the chain from being rewritten after the fact.

**What to build:**
- Hash each footage segment entry and link it to the hash of the preceding entry
- Incorporate all access events into the same chain
- Store the chain in WORM storage: S3 Object Lock in COMPLIANCE mode, hardware WORM storage, or equivalent
- Expose a verification API allowing any party to verify the chain from any entry forward

**The court standard:** Without Merkle chaining, individual hash values can be swapped along with the footage files they purport to represent. Merkle chaining makes substitution detectable at the chain level, not just the file level.

---

### Requirement 3: External immutable anchoring

**What it means:** Merkle roots must be published to an external content-addressed permanent storage system — Arweave or a functional equivalent — on a defined schedule, such that an independent party can verify footage integrity without any cooperation from the vendor.

**Why it matters:** If Merkle roots exist only inside the vendor's infrastructure, a sophisticated adversary who controls that infrastructure can rebuild the chain around altered footage. External anchoring puts the roots somewhere the vendor cannot reach.

**What to build:**
- Compute a Merkle root at intervals not exceeding one hour
- Publish each root to Arweave within four hours of computation
- Maintain a public mapping of Arweave transaction IDs to the time ranges they cover
- Make transaction IDs available to contracting cities and to courts via a public API

**The economics:** At current Arweave rates, anchoring Merkle roots for an entire camera network costs under $1 per day.

**The court standard:** External immutable anchoring means any party — including a defense expert, a judge, or a journalist — can verify that a specific Merkle root existed at a specific time with a specific value, without asking the vendor for anything.

---

### Requirement 4: Mandatory access logging with case number enforcement

**What it means:** Every query against footage or associated metadata must be logged with the querying agency, officer identifier, timestamp, and a mandatory case number. Queries without case numbers must be blocked at the system level, not merely flagged.

**Why it matters:** FOIA-derived audit logs from Flock Safety's network show 233 million searches with 84% carrying no case number. The Institute for Justice has documented at least 28 cases of officers using ALPR systems to track romantic interests. When case numbers are optional, unauthorized personal use is structurally undetectable.

**What to build:**
- Require a valid case number for every query — no exceptions
- Log all queries in the Merkle-chained WORM audit log
- Log all federal agency access with the same specificity as local agency access
- Block queries from unauthorized users at the system level
- Provide contracting agencies with real-time access to their audit logs

**The court standard:** A Fourth Amendment suppression motion can argue that a search without documented case number and purpose cannot be distinguished from the documented pattern of personal abuse. Mandatory enforcement closes this gap by making unauthorized searches impossible rather than merely detectable.

---

### Requirement 5: Independent accuracy certification at 0.1% or better

**What it means:** The vendor must demonstrate through independent third-party testing that its system achieves an error rate of no worse than 1 misidentification per 1,000 reads (0.1%) under standardized conditions. Results must be published and recertified annually.

**Why it matters:** A 2019 industry estimate found the accuracy rate of license plate readers is approximately 90% — one in ten plates misread. DHS's June 2025 market survey acknowledges character confusion errors without setting any minimum standard. The Institute for Justice has documented at least 27 cases of innocent people detained at gunpoint due to ALPR errors since 2018.

The 0.1% standard is two orders of magnitude better than current documented industry performance. It is also the threshold below which wrongful-stop rates become defensible at the scale these networks operate. At 10% error rates scanning 2,000 plates per minute, a network produces thousands of false alerts per hour. At 0.1%, that drops to a manageable number that human officers can meaningfully verify before acting.

**What to build:**
- Commission independent third-party accuracy testing against a standardized plate dataset representing real-world conditions: varied lighting, weather, plate conditions, and character pairs prone to confusion (0/O, 1/I, 8/B, H/M, 2/7)
- Achieve and certify 0.1% error rate or better
- Publish test methodology, dataset description, and results to Arweave permanently
- Commit to annual recertification with results published to the same permanent record
- Provide per-deployment accuracy metrics to contracting agencies

**The court standard:** A Daubert motion under FRE 702 challenges whether the AI system producing identification evidence meets reliability standards. A vendor with published independent accuracy certification at 0.1% can answer that motion. A vendor without it cannot.

---

## The contract language you need to be able to sign

The full model contract language is in [model-contract-language.md](./model-contract-language.md).

The six sections that separate compliant vendors from non-compliant ones:

| Section | Requirement | Current vendor status |
|---|---|---|
| 1 | Hash at capture within camera hardware with Hardware Attestation | Not publicly documented by any major vendor |
| 2 | Merkle-chained WORM audit log | Not publicly documented by any major vendor |
| 3 | External immutable anchoring on Arweave or equivalent | Not publicly documented by any major vendor |
| 4 | Mandatory case number enforcement, all-agency access logging | Not implemented by any major vendor |
| 5 | Prohibition on Undetectable Alteration Capability integrations | Not addressed in any current vendor contract |
| 6 | Independent audit rights for contracting agency | Not standard in current vendor contracts |

A vendor that can sign all six sections without modification is the only vendor a city attorney who has read this documentation can confidently recommend.

---

## Reference implementation

The audit trail architecture required by Sections 2 through 6 is documented and implemented in [ClawQL's security framework](https://docs.clawql.com/security/best-practices) and the `clawql-surveillance` vertical specification.

ClawQL provides out of the box:
- Merkle-chained WORM audit logging with hash-linked entries
- External immutable anchoring via Arweave with public transaction IDs
- Append-only access logging with mandatory field enforcement
- Independent verification API allowing third-party chain validation
- Supply chain signing and hardware attestation receipt and storage
- Per-agency audit log access with role-based controls

Section 1 — hash at capture within camera hardware — requires hardware integration. ClawQL's architecture is designed to receive attestation proofs from camera HSEs and incorporate them into the chain at ingestion. The camera hardware vendor implements the HSE; ClawQL handles everything downstream.

For vendors interested in building on this architecture: [docs.clawql.com](https://docs.clawql.com) · hello@clawql.com

---

## What winning looks like

The vendors that build to these standards before courts require them will own the next procurement cycle. The vendors that wait will be retrofitting legacy infrastructure while their contracts are challenged in court and their footage is excluded from criminal proceedings.

The standards here are not a regulatory wishlist. They are an engineering specification derived from what courts, defense attorneys, and contracting agencies are demonstrably moving toward. The first vendor to ship against this specification defines the market.

The litigation being built through [challengethefootage.com](https://challengethefootage.com) is the mechanism that converts these standards from aspirational to required. Every motion filed, every Daubert hearing held, every contract renewal where a city attorney asks "can you sign Section 5" — each one shortens the timeline to when compliance is mandatory.

Build it now or build it under pressure. The standards are the same either way.
