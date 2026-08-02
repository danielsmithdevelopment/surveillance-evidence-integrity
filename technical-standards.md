# Technical Standards: Cryptographic Integrity Architecture for Surveillance Footage

This document describes the full technical architecture required to make surveillance footage trustworthy as criminal evidence — trustworthy in the specific sense that its integrity can be independently verified through mathematical proof rather than vendor assertion.

It is written for two audiences simultaneously: security engineers who will implement these controls, and lawyers and policymakers who need to understand what they are asking for and why each layer matters. Technical detail is not minimized for the legal audience. The legal argument depends on understanding what the controls actually do.

The architecture described here is derived from the security framework built for [ClawQL](https://docs.clawql.com/security/best-practices), a 32-module agentic AI security stack that implements the same Merkle-chaining, WORM audit logging, and external immutable anchoring patterns in the context of AI agent auditability. The underlying cryptographic and systems architecture is the same. The application to surveillance footage is direct.

---

## The Core Problem

A video file on a server is bytes. Bytes can be changed. Whether those bytes match what a camera originally recorded is a question about the relationship between the current file and the original sensor output — and that relationship, once broken, cannot be restored through inspection of the current file alone.

The question courts implicitly ask when surveillance footage is offered as evidence is: are these the bytes the camera produced? The honest answer, for most current surveillance systems including Flock Safety, is: we don't know. The vendor asserts it. There is no independent technical basis to verify the assertion.

This is not a theoretical problem. The capability to alter video footage in a manner that does not leave forensically detectable traces is commercially available. Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak and former IDF cyber chief Yaron Rosen, sells exactly this capability to government and intelligence clients, as reported by Haaretz in 2022 based on internal documents. Both Toka and Flock Safety have received funding from Andreessen Horowitz. The shared investor relationship does not prove operational coordination. It does establish that the capability and the infrastructure are in close financial proximity.

The architecture described in this document makes silent alteration of footage either impossible or, at minimum, detectable with overwhelming probability — provided the architecture is implemented correctly and the controls are routinely verified.

---

## Layer 1: Hash at Capture

### What it is

A cryptographic hash function takes an arbitrary input — in this case, a unit of video footage — and produces a fixed-length output, called a hash or digest, with two properties that matter here. First, the same input always produces the same output. Second, any change to the input, however small — a single changed pixel, a single altered timestamp bit — produces a completely different output. There is no way to look at a hash and determine what the input was, and there is no practical way to find two different inputs that produce the same hash (this is the collision-resistance property).

SHA-256 produces a 256-bit output. For practical purposes, if two files have the same SHA-256 hash, they are the same file.

### Why it has to happen at the sensor

If the hash is computed inside the camera hardware, from the raw sensor output, before the footage leaves the camera, then the hash is a fingerprint of what the sensor actually recorded. Any subsequent alteration of the footage — anywhere in the pipeline, by anyone — will produce a file whose hash does not match the original fingerprint.

If the hash is computed after the footage leaves the camera, then an attacker who can intercept the footage between the camera and the hash computation can alter the footage, compute a hash of the altered footage, and substitute that hash for the original. The chain of custody starts too late.

This is the most important single control in the entire architecture. Everything downstream depends on it.

### Hardware security elements and trusted execution environments

Computing the hash inside a hardware security element (HSE) or trusted execution environment (TEE) provides a stronger guarantee than software hashing, even software running on the camera itself. An HSE is a dedicated, isolated chip that performs cryptographic operations in an environment that is physically and logically separated from the camera's main processor. A TEE is a hardware-isolated execution environment within the camera's main processor that cannot be accessed by the normal operating system.

Either approach makes it significantly harder for an attacker to substitute a different hash value after the fact, because the hash computation occurs in an environment that cannot easily be tampered with even by someone with administrative access to the camera's operating system.

### Hardware Attestation

Hardware Attestation is a cryptographic proof that a specific hash value was computed in a specific hardware environment at a specific time. Modern hardware security chips can generate attestation reports signed by keys that are burned into the chip at manufacture and cannot be extracted or forged.

An attestation report for a footage hash allows a court to verify not just that the hash value exists, but that it was generated inside the camera hardware from the original sensor data. This closes the gap between "a hash exists" and "the hash was definitely computed from the original footage."

### Current state of Flock Safety

There is no public documentation that Flock Safety computes cryptographic hashes of footage within camera hardware. There is no public documentation of Hardware Attestation. Flock's audit logs, obtained through FOIA, do not contain hash values for footage segments. This means there is currently no technical basis for verifying that any specific Flock footage file matches what the camera originally recorded.

---

## Layer 2: Merkle Chaining

### What it is

A Merkle tree is a data structure built from cryptographic hashes. In the simplest form relevant here — a hash chain — each entry in the chain incorporates the hash of its own content and the hash of the immediately preceding entry.

Entry 1: hash(content_1)
Entry 2: hash(content_2 + hash_of_entry_1)
Entry 3: hash(content_3 + hash_of_entry_2)

The practical consequence of this structure is that you cannot alter any entry in the chain without invalidating all subsequent entries. If you change entry 1, its hash changes. Entry 2 incorporated the original hash of entry 1, so entry 2's hash also changes. And so on through the entire chain.

A Merkle Root is the hash at the top of the structure — a single value that represents the entire chain. If you have the Merkle Root and the full chain, you can verify the integrity of every entry in the chain by recomputing from the bottom up and checking that you arrive at the same root.

### Why this matters for footage integrity

Hash-at-capture gives you a fingerprint of each footage segment. Merkle chaining gives you a provably complete, provably unaltered record of all footage segments in sequence.

Without Merkle chaining, an attacker could replace one footage segment with an altered version, compute a new hash for the altered segment, and substitute that hash for the original in whatever records exist. The hash for the altered segment would be "correct" for the altered content.

With Merkle chaining, altering any segment also breaks every subsequent chain entry. The alteration is visible as a broken chain — a mathematical discontinuity that cannot be repaired without reconstructing the entire chain from the point of alteration forward, which would itself be detectable if the Merkle Roots are externally anchored (see Layer 3).

### Write-once storage

The Merkle Chain must be maintained in write-once, read-many (WORM) storage. An append-only database where existing entries cannot be modified or deleted. If the chain can be rewritten, an attacker with access to the chain storage can rebuild the chain around altered footage.

WORM storage is a standard enterprise capability. S3 Object Lock in COMPLIANCE mode, Worm-compliant database configurations, hardware WORM storage — the technical options are well-established. Flock choosing not to implement this is a policy decision, not a technical limitation.

### Scope: footage and audit logs together

The Merkle Chain should incorporate both footage hashes and Audit Log entries. This means the integrity of the access records — who queried what footage, when, with what authorization — is verifiable by the same mathematical process as the footage itself. An attacker who alters both the footage and the audit log to cover their tracks breaks the Merkle Chain in two places, making the tampering more visible, not less.

---

## Layer 3: External Immutable Anchoring

### What it is

A Merkle Root is a single hash value representing the state of the entire chain at a given moment. Publishing that value to an external immutable store creates a timestamped, permanent, publicly verifiable record that the chain existed in that state at that time.

Arweave is a blockchain-based permanent storage network. Unlike conventional storage, Arweave is designed for permanent retention — the economic model funds ongoing storage through an endowment mechanism. Once a transaction is confirmed on Arweave, it cannot be altered or deleted by any party, including Arweave itself. The transaction ID is a content address: it identifies the data by its own hash, so anyone with the transaction ID can retrieve and verify the data independently, without asking anyone for permission.

The cost is low. A typical Merkle Root value — a 32-byte hash — costs a fraction of a cent to store on Arweave permanently.

### Why external anchoring matters

Without external anchoring, the Merkle Roots exist only inside Flock's infrastructure. Flock controls that infrastructure. A sophisticated attacker who also controls Flock's infrastructure — or who is Flock, or who has compromised Flock's systems — could rebuild the chain, compute new Merkle Roots for the rebuilt chain, and substitute those roots for the originals.

With external anchoring, the original Merkle Roots exist permanently outside any party's control, in a form anyone can retrieve and verify. Rebuilding the chain produces different Merkle Roots. Those different roots don't match the values published to Arweave before the alteration. The discrepancy is the evidence of tampering.

### Publication schedule

Merkle Roots should be anchored externally on a schedule that limits the window of vulnerability. If roots are anchored hourly, an attacker has at most one hour's worth of footage that could theoretically be altered without creating a detectable discrepancy in the external record. If roots are anchored daily, the window is 24 hours. The shorter the anchoring interval, the smaller the window.

For a system used to generate criminal evidence, hourly anchoring is a reasonable standard.

### IPFS as a complementary system

IPFS (InterPlanetary File System) is a content-addressed peer-to-peer storage network. Unlike Arweave, IPFS does not guarantee permanent storage — data is only retained as long as at least one node is "pinning" it. But IPFS is useful as a staging layer and for distributing access to footage and audit materials across multiple parties.

A practical architecture uses IPFS for rapid access and distribution, with Arweave as the permanent canonical record. The Arweave transaction ID serves as the authoritative reference in legal proceedings.

---

## Layer 4: Append-Only Audit Logging

### What it is

An Audit Log is a complete chronological record of everything that has happened to footage from the moment of capture forward: who accessed it, when, with what stated justification, what they did with it, where it went.

Append-only means entries can be added but not modified or deleted. This is the WORM property applied to the log.

### What the log must capture

At minimum, the Audit Log should record:

**Capture events:** Camera identifier, timestamp, GPS coordinates, footage segment hash, Hardware Attestation reference.

**Access events:** The identity of every person or system that accessed the footage, the timestamp of access, the access method (direct query, API call, export, etc.), and any case number or stated justification provided.

**Query events:** In ALPR systems specifically, every plate query — the queried plate, the querying agency, the querying officer or user identifier, the timestamp, and any case number. Not just queries where a case number was filled in. All queries.

**Export events:** Every time footage leaves Flock's infrastructure — transferred to a law enforcement agency, exported for litigation, shared with federal agencies — the destination, the timestamp, the identity of the authorizing party, and the hash of the exported footage.

**Administrative events:** Any change to system configuration, user permissions, retention policies, or integrity controls.

### The case number problem

FOIA-derived audit logs from Flock show that 84% of searches against their network carry no case number. This is partly a workflow problem — officers run searches before a case number exists — but it also reflects the absence of any technical requirement to log justification.

A properly implemented Audit Log logs every access regardless of whether a case number is provided. The absence of a case number is itself informative and should be logged as a field value ("none provided"), not treated as a reason to skip the log entry.

### Correlation with the Merkle Chain

Audit Log entries should carry a correlation identifier that ties them to the Merkle Chain entry for the relevant footage segment. This allows any investigator or court to reconstruct the complete history of a footage segment — what was recorded, when, by which camera, who accessed it, when, and what happened to it — from a single query against the Merkle-chained log, with mathematical proof that the log is complete and unaltered.

This is the same pattern implemented in ClawQL's observability architecture, documented at [docs.clawql.com/security/best-practices/security-monitoring-observability-siem](https://docs.clawql.com/security/best-practices/security-monitoring-observability-siem), where every AI agent action is traced from high-level intent through low-level system action using shared correlation identifiers across immutable logs.

---

## Layer 5: File Integrity Monitoring

### What it is

File Integrity Monitoring (FIM) watches critical files, directories, and processes for unauthorized changes. Tools like Tetragon (eBPF-based, kernel-level enforcement) and Wazuh (agent-based monitoring) can detect or block unauthorized access to sensitive files, alert on permission changes, and log intrusion attempts into the same WORM audit pipeline.

### What it protects against

FIM is primarily useful against post-capture tampering — someone with access to Flock's servers trying to alter footage files or audit logs after they've been written to disk. It can detect and log the attempt, and in blocking configurations can prevent it entirely.

FIM events should be fed into the same Merkle-chained audit log as footage and access events. This means an intrusion attempt itself becomes part of the permanent, verifiable record.

### What it does not protect against

FIM cannot detect alteration that occurs before footage is written to disk. If a Toka-style capability intercepts and alters the camera feed between the sensor and the first write to storage, FIM on the storage layer sees only the already-altered file. The hash of that file will be "correct" for the fake content. The Merkle Chain will validate. The External Immutable Anchor will permanently store the fabricated record.

This is the gap that Layer 1 — hash at capture, inside the camera hardware — is designed to close. FIM and hash-at-capture are complementary, not redundant. FIM protects the storage and logging infrastructure. Hash-at-capture protects against upstream feed alteration.

---

## Layer 6: Supply Chain Integrity

### Why this matters

The entire architecture above assumes that the software and firmware running on the cameras and the logging infrastructure is the software and firmware that was intended to be deployed. A compromised firmware update could disable hash-at-capture, substitute false hash values, or suppress logging — all before any of the subsequent layers can detect anything wrong.

Supply chain integrity controls address this. They include:

**Signed firmware:** Camera firmware updates are cryptographically signed by the manufacturer. The camera verifies the signature before applying any update. Unsigned updates are rejected.

**Digest-pinned deployments:** Software components in the logging infrastructure are referenced by cryptographic hash (digest), not by mutable version tags. Deploying a different version requires changing the digest reference, which itself creates an auditable event.

**Cosign verification:** The Cosign tool, combined with admission control policies (Kyverno or equivalent), can enforce that only containers with valid cryptographic signatures are allowed to run in the logging infrastructure. An attacker who substitutes a malicious container cannot do so silently.

**SBOM (Software Bill of Materials):** A complete, signed list of all software components in the system, allowing rapid identification of affected components when vulnerabilities are disclosed.

This layer is documented in detail at [docs.clawql.com/security/best-practices/container-image-security-pinning-distroless-golden-images](https://docs.clawql.com/security/best-practices/container-image-security-pinning-distroless-golden-images) and adjacent modules.

---

## What the Full Stack Looks Like

```
[Camera Sensor]
      |
      | Raw sensor data
      v
[Hardware Security Element / TEE]
      |
      | hash(raw_footage_segment) + Hardware Attestation
      v
[Camera Firmware (signed, verified)]
      |
      | (footage, hash, attestation)
      v
[Encrypted transmission]
      |
      v
[Flock Infrastructure]
      |
      +-- [WORM Storage] <-- footage segments
      |
      +-- [Merkle Chain Engine]
      |         |
      |         | incorporates: footage hashes + audit log entries
      |         | produces: Merkle Root every [interval]
      |         v
      |   [External Immutable Anchor (Arweave)]
      |         |
      |         | permanent, public, independently verifiable
      |
      +-- [FIM Layer (Tetragon/Wazuh)]
      |         |
      |         | monitors: storage volumes, log directories, signing keys
      |         | feeds alerts into: Merkle-chained audit log
      |
      +-- [Append-Only Audit Log]
                |
                | all access, query, export, administrative events
                | incorporated in Merkle Chain
```

At any point in a criminal proceeding, an independent party can:

1. Retrieve the Merkle Root for the relevant time period from Arweave using the publicly recorded transaction ID
2. Obtain the Merkle Chain entries covering the footage segment at issue
3. Compute the hash of the footage file as produced in the proceeding
4. Verify that the computed hash matches the entry in the Merkle Chain
5. Verify that the Merkle Chain verifies against the retrieved Merkle Root
6. Verify the Hardware Attestation confirming the hash was computed inside the camera hardware

If all six steps pass, there is a mathematical proof — not an assertion, a proof — that the footage file matches what the camera originally recorded.

If any step fails, there is mathematical evidence of a problem: alteration of the footage, a gap in the chain, or a discrepancy between the chain and the external anchor. The specific nature of the failure points to where in the pipeline the problem occurred.

---

## The Residual Risk That No Architecture Eliminates

A nation-state level adversary who can compromise multiple independent layers simultaneously — the camera hardware, the logging infrastructure, and the Arweave blockchain — could potentially produce a fabricated record that passes all verification steps. This is not a realistic threat for most purposes.

The more realistic residual risks are:

**Upstream feed alteration:** If a camera's network connection is intercepted and the feed is altered in transit, before reaching the hash computation inside the camera's secure element, the secure element will hash the altered feed. This is why hardware security elements that compute the hash from the raw sensor output before any digital processing are important — they minimize the window between physical reality and cryptographic commitment.

**Compromised logging software:** A supply chain attack that compromises the Merkle Chain engine could produce valid-looking chains for fabricated content. This is why supply chain integrity controls (Layer 6) and the external immutable anchor are both necessary — the anchor exists outside the logging software's reach.

**Incomplete coverage:** If some cameras are not covered by the architecture, footage from those cameras cannot be authenticated. Coverage gaps are an implementation problem, not an architectural problem.

**Failure to verify:** The architecture only helps if someone actually checks the proofs. Merkle verification should be automated and its results should be part of the evidentiary record in every proceeding involving footage from the system.

---

## For Lawyers: What to Ask For

When seeking discovery of authentication materials in a proceeding involving Flock footage, request:

1. The cryptographic hash value of the footage segment at issue, as computed at the time of capture
2. Documentation of where and how that hash was computed — specifically whether it was computed within camera hardware or by software processes after transmission
3. Any Hardware Attestation records associated with the hash computation
4. The Merkle Chain entries covering the footage segment
5. The Merkle Root value for the relevant time period
6. The External Immutable Anchor transaction identifier for that Merkle Root, and a demonstration of independent retrieval of the root from the external anchor
7. The complete Audit Log for the footage segment, from capture through production in the proceeding, in original format with all metadata
8. Documentation of any access to the footage or to the systems storing the footage by any party other than Flock employees — including any federal agency access

If Flock cannot produce items 1 through 6, the footage lacks the cryptographic foundation required for independent authentication. That is the basis of an FRE 901 challenge.
