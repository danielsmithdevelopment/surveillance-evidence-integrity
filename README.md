# Surveillance Evidence Integrity Standards

This repository contains model contract language, draft legislation, technical standards, and legal guidance addressing a specific and largely unexamined problem: footage from mass surveillance camera networks like Flock Safety cannot currently be authenticated as unaltered when introduced as criminal evidence.

The problem is not theoretical. A company called Toka — co-founded by former Israeli Prime Minister Ehud Barak and former IDF cyber chief Yaron Rosen — sells technology to government clients that can alter both live camera feeds and archived footage without leaving forensic traces, as reported by Haaretz in 2022. Andreessen Horowitz has funded both Toka and Flock Safety. Flock's current architecture has no technical controls that would detect or prevent silent alteration of footage, and cannot generate the cryptographic proof that authentication of digital evidence requires.

FOIA-derived audit logs published at haveibeenflocked.com show 233 million searches against Flock's network, with 84% carrying no case number and approximately 9% tied to documented crimes. FBI and Homeland Security have accessed local Flock networks without clear local awareness or approval. Dozens of cities have already canceled contracts over the access problem. The integrity problem — whether the footage itself can be trusted as evidence — has received far less attention.

This repository is an attempt to give that problem concrete form: documents that lawyers, city council staffers, legislators, and journalists can take and use.

## Background

Full technical and legal analysis is available here:

- [Long-form X/Twitter post]([https://x.com/DanielSmithDev/status/2084048838193721626]) — complete technical and legal argument
- [LinkedIn piece]([https://www.linkedin.com/posts/danielsmithdev_have-i-been-flocked-search-flock-alpr-share-7489705881710800896-nZvX]) — compressed version for professional audiences

The technical architecture described in these documents is derived from work building [ClawQL's security stack](https://docs.clawql.com/security/best-practices), a 32-module agentic AI security framework that implements the same Merkle-chaining, WORM audit, and external immutable anchoring patterns that Flock would need to make its footage trustworthy as evidence.

## Documents

### [Model Contract Language](./model-contract-language.md)
Clause-ready language for city councils negotiating or renewing Flock contracts. Covers cryptographic integrity requirements, audit log standards, external anchoring obligations, and prohibitions on undetectable-alteration integrations. Includes defined terms and commentary.

### [Model Legislation](./model-legislation.md)
Draft statutory language for state legislatures establishing minimum cryptographic integrity standards as a prerequisite for surveillance footage admissibility in criminal proceedings. Includes findings, definitions, operative requirements, and an enforcement mechanism.

### [Technical Standards](./technical-standards.md)
Full architecture documentation: hardware attestation through Merkle chaining through external immutable anchoring. Written so both security engineers and lawyers can follow it. Explains what each layer does, what it protects against, and where the remaining gaps are.

### [Authentication Challenge Guide](./authentication-challenge-guide.md)
Practical guidance for defense attorneys challenging the admissibility of Flock footage on authentication grounds under Federal Rule of Evidence 901. Includes discovery requests, motion framework, and how to use Flock's responses — or non-responses — to build the argument.

## How to use this

Everything here is free to use, adapt, and improve. Fork the repo. Submit pull requests with improvements to the legal language. Open issues if you find technical errors or gaps.

If you are a **defense attorney**: start with the authentication challenge guide, then reference the technical standards document for the expert witness and discovery components.

If you are a **city council staffer or city attorney**: the model contract language document is designed to be dropped into a contract redline. The technical standards document explains what you're asking for in plain terms.

If you are a **legislative staffer**: the model legislation document includes findings language and defined terms. The technical standards document provides the factual basis for the findings.

If you are a **journalist**: the technical standards document is the most detailed primary source here on what controls exist, what controls are missing, and why that matters for evidence reliability.

If you are a **security researcher or engineer**: pull requests improving the technical standards document are particularly welcome. The architecture described here is implementable with current technology. The question is whether Flock has any incentive to implement it without being required to.

## Contributing

This is a living document. Legal standards for digital evidence authentication are evolving. The technical capability to alter video undetectably is advancing. Pull requests, issues, and forks are welcome.

Areas where contributions would be most useful:

- State-specific variations on the model legislation
- Additional discovery request language
- Technical implementation details, particularly on hardware attestation at the camera level
- Case law citations for the authentication challenge guide
- International equivalents for non-US jurisdictions

## Author

Built by [Daniel Smith](https://github.com/danielsmithdevelopment), architect of the [ClawQL](https://docs.clawql.com) agentic AI security framework.
