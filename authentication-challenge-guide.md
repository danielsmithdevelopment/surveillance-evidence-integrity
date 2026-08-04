# Authentication Challenge Guide: Flock Safety Footage in Criminal Proceedings

This document is written for defense attorneys whose clients face criminal charges in which footage from Flock Safety's license plate reader or camera network is offered as evidence by the prosecution. It provides a framework for challenging the authentication of that footage under Federal Rule of Evidence 901 and its state equivalents.

For **body-worn cameras** and **cell phone / deepfake** video — with parallel case citations and news sources — see [challenge-tool/FOOTAGE-CHALLENGE.md](./challenge-tool/FOOTAGE-CHALLENGE.md). The Challenge the Footage docs generator uses those fact packs when `footageCategory` is `body_worn` or `cellphone`.

This is not a complete brief. It is a starting framework that needs to be adapted to the specific facts of each case, the jurisdiction's rules, and the available expert support. Nothing here is legal advice.

---

## The Core Argument

Federal Rule of Evidence 901(a) requires the proponent of evidence to produce evidence sufficient to support a finding that the item is what the proponent claims it is. For Flock Safety footage, the claim is that the footage is an accurate recording of what occurred at a specific location at a specific time, unaltered since capture.

That claim rests on a technical foundation. The question is whether the foundation exists.

Flock Safety does not publicly document that it implements cryptographic hashing of footage at the point of capture. It does not publicly document Merkle-chained audit logs. It does not publish Merkle Roots to any external immutable store that would allow independent verification of footage integrity. The audit logs obtained through FOIA by haveibeenflocked.com — which show 233 million searches with 84% carrying no case number — do not contain hash values for footage segments.

Without these controls, "this footage is what the camera recorded, unaltered" is Flock's assertion. It is not a mathematically provable fact. And the capability to alter video footage without leaving forensically detectable traces is not theoretical — it is commercially available, as documented in Haaretz's 2022 reporting on Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak, which shares an investor (Andreessen Horowitz) with Flock Safety.

The argument is not that the footage was altered. The argument is that there is no independent technical basis to verify that it was not — and that without such a basis, authentication under FRE 901 has not been met.

---

## Applicable Rules

**FRE 901(a):** The general authentication requirement. The proponent must produce evidence sufficient to support a finding that the item is what the proponent claims.

**FRE 901(b)(1):** Authentication by testimony from a witness with knowledge. A Flock employee or law enforcement officer testifying that "this is footage from our system" satisfies this in a purely formal sense, but the witness's knowledge is limited to what Flock's internal systems show. They cannot testify, from personal knowledge, that the footage is unchanged since capture if there are no cryptographic controls generating that proof.

**FRE 901(b)(9):** Authentication of a process or system by evidence describing the process or system and showing it produces an accurate result. This is the most important provision here. If the prosecution authenticates Flock footage under 901(b)(9) — as a product of a reliable system — the defense should demand a full description of the system, including its integrity controls, and then challenge whether those controls are sufficient to establish reliability.

**FRE 901(b)(3):** Comparison by an expert witness. A defense expert can compare the footage's technical characteristics against what an authenticated, unaltered video from Flock's system should look like — and can testify to the absence of controls that would make that comparison meaningful.

**State equivalents:** Most states have evidence rules substantially similar to FRE 901. A small number have adopted more specific rules for digital evidence authentication. Research the specific jurisdiction.

---

## Discovery Requests

Serve the following on the prosecution as part of standard discovery, supplemented by any state-specific digital evidence discovery rules. Frame these as requests for materials in the prosecution's possession, custody, or control — which includes materials held by Flock Safety as an agent of the prosecution for purposes of this case.

**Request 1:** The complete, original, unedited video file(s) at issue, in the format in which they were stored on Flock's servers, along with all associated metadata including but not limited to: file creation timestamps, modification timestamps, access timestamps, file size, encoding format, frame rate, resolution, camera identifier, GPS coordinates, and any embedded metadata fields.

**Request 2:** The cryptographic hash value of each footage file as computed at or near the time of capture, the algorithm used to compute it, and documentation establishing when and where the computation was performed — specifically whether it was performed within the camera hardware or by software processes after transmission from the camera.

**Request 3:** All Hardware Attestation records associated with the footage at issue, including any records generated by hardware security elements within the camera confirming that a specific hash value was computed within the camera hardware at a specific time.

**Request 4:** All entries in Flock Safety's Merkle-chained audit log covering the footage at issue, if any such log exists, including: the hash of each log entry, the hash linking each entry to the preceding entry, and the Merkle Root value for the relevant time period.

**Request 5:** All External Immutable Anchor records associated with the Merkle Root for the relevant time period, if any such records exist — specifically the transaction identifier for any Arweave, IPFS, or equivalent permanent storage transaction in which the Merkle Root was anchored, and a demonstration of independent retrieval of that Root from the external system.

**Request 6:** The complete Audit Log for the footage at issue, covering all events from initial capture through production in this proceeding, including: all access events with the identity of the accessing party, timestamp, and purpose stated; all query events; all export or transfer events; all federal agency access events; and all administrative events affecting the footage or the systems storing it.

**Request 7:** All technical documentation describing Flock Safety's footage integrity controls, including any documentation of cryptographic hashing, audit logging, access controls, chain of custody procedures, and data retention policies.

**Request 8:** All communications between the prosecution, law enforcement agencies involved in this case, and Flock Safety regarding the footage at issue, including any communications about the footage's chain of custody, integrity, or authentication.

**Request 9:** All information regarding any access to the footage or to Flock's systems storing the footage by any federal agency, including FBI and Department of Homeland Security, whether or not that access was related to this specific case.

**Request 10:** Any agreement between Flock Safety and any third party providing that third party with access to camera footage or associated data, to the extent that agreement could affect the integrity or chain of custody of the footage at issue.

---

## How to Use the Responses

### If Flock cannot produce hash values computed at capture (Requests 2 and 3)

This is the most significant gap. Without a hash computed at capture — especially one generated inside the camera hardware and attested to by Hardware Attestation — there is no cryptographic basis to determine whether the footage file as produced matches what the camera originally recorded.

The argument: The prosecution cannot satisfy FRE 901(b)(9) because it cannot show that Flock's system produces an accurate result. The system's accuracy in preserving footage cannot be independently verified because no record was made, at the time of capture, of what the footage contained. Any witness who testifies that "this is what the camera recorded" is making an assertion about Flock's internal processes that cannot be independently confirmed.

Supplement this with expert testimony on the current state of video alteration technology — specifically the publicly documented capability to alter surveillance footage without leaving forensically detectable traces.

### If Flock cannot produce Merkle Chain records (Request 4)

Without Merkle chaining, there is no cryptographic proof that the Audit Log is complete or unaltered. Access events could have been added, removed, or modified. The access history the prosecution presents is an administrative record, not a tamper-evident one.

More significantly for authentication: without a Merkle Chain incorporating footage hashes, there is no continuous mathematical proof linking the produced footage to the original camera output. Individual hash values, even if they exist, exist in isolation — they can be swapped along with the footage files they purport to represent.

### If Flock cannot produce External Immutable Anchor records (Request 5)

Without external anchoring, whatever Merkle Chain exists is stored inside Flock's infrastructure, which Flock controls. The absence of external anchoring means there is no way to verify that the Merkle Chain presented in this proceeding is the same chain that existed at the time of the events at issue. The chain itself could have been rebuilt.

### If the Audit Log reveals federal agency access (Request 6 and 9)

FOIA data shows FBI and Homeland Security have accessed Flock networks without clear local agency awareness. If the Audit Log reveals federal agency access to footage at issue — or if Flock cannot produce a complete Audit Log and therefore cannot rule out such access — this creates additional chain of custody questions. Who had access to the footage? What did they do with it? When?

The absence of a complete, tamper-evident Audit Log means these questions cannot be answered from the record.

### If Flock refuses to produce materials or claims they don't exist

Either response is useful. If Flock claims that hash values, Merkle Chain records, and External Immutable Anchors don't exist, that confirms the absence of the technical controls — which is the basis of the authentication challenge. If Flock refuses to produce materials that may exist, that is a discovery compliance issue with its own remedies.

In either case, document the response and its implications carefully for the motion.

---

## Motion Framework

### Motion in Limine to Exclude Flock Safety Footage for Failure of Authentication

**I. Introduction**

Brief statement of the issue: the prosecution intends to offer footage from Flock Safety's surveillance network; defendant moves to exclude it on the ground that authentication under FRE 901 has not been and cannot be met.

**II. The Authentication Requirement**

Describe FRE 901(a) and the specific provisions under which the prosecution will seek to authenticate — likely 901(b)(1) and/or 901(b)(9). Note that 901(b)(9) requires showing the system produces an accurate result, not merely that it exists and was operating.

**III. The Technical Foundation for the Challenge**

This section should be supported by a defense expert declaration. Cover:

- What cryptographic integrity controls would be necessary to independently verify that a video file matches what a camera originally recorded
- What those controls consist of technically: hash at capture within hardware security elements, Merkle chaining, external immutable anchoring, append-only audit logging
- The current state of video alteration technology, specifically the publicly documented capability to alter surveillance footage without leaving forensically detectable traces — cite Haaretz's 2022 reporting on Toka
- Whether Flock Safety's system implements these controls — based on discovery responses, public documentation, and expert analysis

**IV. What Discovery Has Shown**

Describe each discovery request and Flock's response. Document specifically:

- Whether hash values computed at capture were produced, and if so, whether they were generated within camera hardware with Hardware Attestation
- Whether Merkle Chain records were produced
- Whether External Immutable Anchor records were produced
- What the Audit Log shows or, if no complete Audit Log was produced, the absence of a complete tamper-evident access history
- Any federal agency access to the footage or the systems storing it

**V. Why Authentication Has Not Been Met**

Connect the discovery findings to the authentication standard. The prosecution cannot authenticate Flock footage under 901(b)(9) because:

- Without hash-at-capture, there is no record of what the camera originally recorded that can be compared to the produced footage
- Without Merkle chaining, there is no continuous mathematical proof linking the produced footage to any original hash value that might exist
- Without external immutable anchoring, whatever records exist are under Flock's control and cannot be independently verified
- Without a complete tamper-evident Audit Log, the chain of custody cannot be reconstructed

The produced footage is a video file whose relationship to the camera's original output cannot be mathematically established. Under these circumstances, a witness's assertion that "this is footage from our system" does not satisfy the authentication standard.

**VI. The Reliability of the Challenge**

Anticipate the prosecution's argument that courts routinely admit surveillance footage without cryptographic proof. Distinguish: courts routinely admit footage in contexts where the practical capability to alter it undetectably did not exist, where the chain of custody was more limited and verifiable, and where the concerns raised here had not been specifically raised. The admissibility of surveillance footage in past cases does not resolve whether this footage meets the authentication standard when specifically challenged on these grounds.

**VII. Relief Requested**

Exclusion of the footage, or in the alternative, a hearing at which Flock Safety's technical personnel are required to demonstrate, through live independent verification, that the footage meets the authentication standards described in this motion.

---

## Working with Technical Experts

Defense attorneys challenging Flock footage will need a technical expert. The expert should be able to:

- Explain hash functions, Merkle trees, and external immutable anchoring to a lay jury or court in plain terms
- Review whatever technical documentation Flock produces in discovery and opine on whether it demonstrates the controls described in this guide
- Attempt independent verification of footage integrity using whatever materials Flock produces — and document the results, including any failure to verify
- Testify about the current state of video alteration technology and the publicly documented capabilities of systems like Toka

Potential sources for expert referrals: university computer science and digital forensics departments, digital forensics firms with experience in video authentication, security researchers who have published on video integrity and content provenance.

The ClawQL security framework documentation at [docs.clawql.com/security/best-practices](https://docs.clawql.com/security/best-practices) provides detailed technical documentation of the architecture described in this guide and may be useful background for experts preparing testimony.

---

## The Broader Picture

Individual authentication challenges in individual cases are important for the clients in those cases. They also serve a larger function.

Courts that grapple with these arguments develop case law. Case law that takes seriously the absence of cryptographic integrity controls in surveillance systems creates pressure on vendors to implement those controls. Prosecutors who repeatedly face authentication challenges to Flock footage have an interest in pushing Flock to implement controls that make their evidence more defensible. City officials who learn that footage from their contracted surveillance network has authentication problems in court have a procurement and liability interest in demanding better controls.

This is a slow process. The authentication challenges being filed today are building the legal foundation for standards that will eventually be required. The argument gets stronger each time a new capability for undetectable video alteration is publicly documented, and each time Flock fails to implement controls that would defeat it.

The clients in current cases deserve the best available challenge on their specific facts. The broader purpose of raising these challenges is a stronger evidentiary framework for everyone who will be prosecuted using surveillance footage in the years ahead.
