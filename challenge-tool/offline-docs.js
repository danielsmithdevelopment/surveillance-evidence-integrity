/**
 * Deterministic document templates used when ClawQL chat is unavailable
 * (local/dev) or as an explicit offline generation mode.
 * Production still prefers live gateway generation via gwChat.
 */

function bullets(items) {
  return items.map((f, i) => `${i + 1}. ${f}`).join("\n");
}

function discoveryBlock(vendorName, kind) {
  const common = {
    auth: [
      `All cryptographic hashing, signing, or integrity-check mechanisms applied to ${vendorName} footage within camera hardware at or before network transmission.`,
      `Documentation of any Merkle tree, hash chain, or similar structure applied to ${vendorName} audit logs or footage segments.`,
      `Identification of any external (non-${vendorName}-controlled) system to which footage hashes, Merkle roots, or integrity proofs are anchored.`,
      `Complete access / query logs for the footage segment(s) at issue, including actor identity, timestamp, purpose, and case number fields.`,
      `Policies and technical controls governing who may export, edit, or re-encode ${vendorName} footage.`,
      `Change-management and software-update records for the camera firmware and backend for the 24 months preceding the capture date.`,
      `Any internal or third-party security assessments addressing undetectable alteration of live or archived ${vendorName} feeds.`,
      `Vendor contracts, SLAs, and representations concerning footage authenticity made to the contracting agency.`,
      `Chain-of-custody documentation from capture through production in this case.`,
      `Identity of every person who accessed, exported, or transmitted the footage segment(s) at issue.`,
    ],
    accuracy: [
      `All accuracy, precision, recall, and false-positive / false-negative testing for ${vendorName}'s identification or ALPR models.`,
      `Independent third-party validation studies of ${vendorName} accuracy, if any.`,
      `Error-rate metrics broken down by lighting, weather, plate type, state designation, vehicle speed, and camera angle.`,
      `Internal quality dashboards and thresholds used to decide when a match may be surfaced to an officer.`,
      `Training data provenance and demographic / geographic coverage for the models used.`,
      `All known character-confusion error classes (e.g., 0/O, 1/I) tracked by ${vendorName}.`,
      `Incident reports of wrongful stops, detentions, or arrests attributable to ${vendorName} misreads.`,
      `Communications with DHS, NIST, or other agencies regarding ALPR error rates.`,
      `Version history of the models and OCR pipelines in use on the capture date.`,
      `Any A/B or canary testing showing accuracy regression after firmware or model updates.`,
    ],
    access: [
      `Complete ${vendorName} query history for the searching officer for the 90 days surrounding the query at issue.`,
      `All queries by that officer lacking a case number or stated law-enforcement purpose.`,
      `Department policy on documentation requirements for ALPR / surveillance queries.`,
      `Audit logs for the specific query that produced evidence against the defendant, with full metadata.`,
      `Prior complaints, IA investigations, or discipline involving the officer's ALPR use.`,
      `Agency-wide statistics on queries without case numbers for the prior 12 months.`,
      `Training materials provided to officers on lawful use of ${vendorName}.`,
      `Any alerts or anomaly detection for personal / stalking-pattern queries.`,
      `Retention and deletion policies for query logs.`,
      `List of all agencies and federal partners with access to the local ${vendorName} network.`,
    ],
  };
  return common[kind].map((r, i) => `${i + 1}. ${r}`).join("\n");
}

export function buildOfflineDocs({ vendorName, profile, ctx, enriched }) {
  const authFacts = profile?.authFacts || [
    `${vendorName} has not publicly documented cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring.`,
  ];
  const errorFacts = profile?.errorRateFacts || [
    `Industry ALPR systems have been estimated to operate at approximately a 10% plate misread rate; DHS has acknowledged character-confusion errors without setting a minimum acceptable standard.`,
  ];
  const accessFacts = profile?.accessAbuseFacts || [
    `Documented cases nationwide show officers using ALPR networks for personal purposes; FOIA-derived logs show a high share of queries without case numbers.`,
  ];
  const civilFacts = profile?.civilFacts || [
    `Wrongful stops and detentions based on unreliable ALPR output can support Fourth Amendment claims under 42 U.S.C. § 1983.`,
  ];
  const sources = profile?.sources || [
    "Public reporting and government market surveys on ALPR systems",
  ];

  const caption = `IN THE ${String(ctx.court).toUpperCase()}

Case No. ${ctx.caseNumber}

${ctx.jurisdiction.toUpperCase()}
v.
${ctx.defendant.toUpperCase()},
          Defendant.
`;

  const extra = enriched ? `\n\n[Context supplied by operator / memory]\n${enriched}\n` : "";

  const motion = `${caption}
MOTION IN LIMINE TO EXCLUDE ${vendorName.toUpperCase()} SURVEILLANCE FOOTAGE
FOR LACK OF AUTHENTICATION UNDER FRE 901

I. INTRODUCTION

1. Defendant moves to exclude ${vendorName} surveillance footage (${ctx.cameraType || "surveillance camera footage"}) offered by the prosecution because the system that produced it cannot be authenticated under Federal Rule of Evidence 901.

2. Relief sought: exclusion of the footage and all derivative testimony, or in the alternative a Daubert-style evidentiary hearing requiring live demonstration of cryptographic integrity controls.

II. FACTUAL BACKGROUND

3. The prosecution intends to introduce footage / identification output from ${vendorName} relating to Case ${ctx.caseNumber} in ${ctx.court}, ${ctx.jurisdiction}${ctx.city ? ` (${ctx.city})` : ""}.

4. Documented integrity gaps for ${vendorName}:
${bullets(authFacts)}
${extra}
III. LEGAL STANDARD

5. FRE 901(a) requires evidence sufficient to support a finding that the item is what the proponent claims. FRE 901(b)(9) addresses evidence describing a process or system and showing that it produces an accurate result.

6. Vendor assertion is not a substitute for independently verifiable process reliability.

IV. ARGUMENT

7. The record does not show that ${vendorName} computes a cryptographic hash of footage within camera hardware at capture.

8. The record does not show Merkle-chained audit logs covering the segment at issue.

9. The record does not show external immutable anchoring of Merkle roots or equivalent integrity proofs outside ${vendorName}'s control.

10. The record does not show tamper-evident access logs for all queries regardless of case number.

11. Undetectable alteration capability is commercially documented (e.g., reporting on Toka / Haaretz 2022). Systems that cannot independently prove integrity are not reliable under FRE 901(b)(9).

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "auth")}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant respectfully requests that the Court:
A. Exclude the ${vendorName} footage and related identification evidence;
B. Or, in the alternative, convene an evidentiary hearing requiring ${vendorName} to demonstrate cryptographic integrity controls through independent verification;
C. Grant such other relief as the Court deems just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name, bar number, contact — TO BE COMPLETED]
`;

  const accuracy = `${caption}
MOTION TO EXCLUDE ${vendorName.toUpperCase()} AI / ALPR EVIDENCE
UNDER FRE 702 AND DAUBERT

I. INTRODUCTION

1. Independent of authentication, Defendant moves to exclude ${vendorName} AI-generated surveillance / ALPR evidence as unreliable under FRE 702 and Daubert v. Merrell Dow Pharmaceuticals.

II. LEGAL STANDARD

2. FRE 702 requires reliable principles and methods, reliably applied. The Court is the gatekeeper for scientific and technical evidence, including AI identification systems used to justify stops or prosecutions.

III. THE ERROR-RATE PROBLEM

3. Documented accuracy concerns:
${bullets(errorFacts)}

4. Proposed minimum reliability threshold for evidence used to initiate stops, detentions, or prosecutions: no worse than 1 error per 1,000 reads (0.1%), independently verified by a neutral third party — two orders of magnitude better than commonly cited industry plate-misread performance.

IV. ARGUMENT

5. ${vendorName} has not demonstrated through independent testing that its system meets that threshold for the conditions present in this case.

6. No clear judicial consensus yet defines an acceptable error rate for AI-generated surveillance evidence used in criminal prosecution; gatekeeping under Daubert still requires a reliability showing.

7. Character-confusion errors (0/O, 1/I, and similar) are a known failure mode producing wrongful stops.

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "accuracy")}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant requests exclusion of the ${vendorName} AI / ALPR evidence, or an evidentiary hearing requiring production of independent accuracy testing data, and such other relief as is just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name — TO BE COMPLETED]
`;

  const access = `${caption}
MOTION TO SUPPRESS EVIDENCE OBTAINED THROUGH ${vendorName.toUpperCase()}
SURVEILLANCE — FOURTH AMENDMENT

I. INTRODUCTION

1. Defendant moves to suppress all evidence obtained through or derived from ${vendorName} queries / surveillance on Fourth Amendment grounds.

II. LEGAL STANDARD

2. Warrantless searches require a legitimate law-enforcement purpose. Evidence from unconstitutional searches is subject to the exclusionary rule (Mapp v. Ohio and progeny). ALPR / network queries used to initiate stops or investigations are searches for constitutional analysis when they produce investigative action against a person.

III. ACCESS-ABUSE PATTERN

3. Documented abuse and control failures:
${bullets(accessFacts)}

4. Specific search facts (operator-provided): ${ctx.searchFacts || "not specified — discovery is required to establish purpose, case number, and authorization for the query at issue."}

IV. ARGUMENT

5. Without a documented case number, stated law-enforcement purpose, and verifiable authorization chain, the search producing evidence against ${ctx.defendant} cannot be distinguished from the documented pattern of unauthorized personal use.

6. Systemic access-control failures and incomplete audit trails undermine reliance on vendor-controlled logs to justify the search.

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "access")}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant requests suppression of all evidence obtained through or derived from the ${vendorName} search, and such other relief as is just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name — TO BE COMPLETED]
`;

  const civil = `DEMAND LETTER — 42 U.S.C. § 1983
================================

Date: ${new Date().toISOString().slice(0, 10)}

VIA EMAIL AND CERTIFIED MAIL

City / County Attorney
Police Department / Contracting Agency
${ctx.city || ctx.jurisdiction}

Re: Constitutional claims arising from ${vendorName} surveillance — ${ctx.defendant} / Case ${ctx.caseNumber}

Dear Counsel:

I. OPENING

This letter states claims under the Fourth Amendment and 42 U.S.C. § 1983 arising from the use of ${vendorName} surveillance technology against ${ctx.defendant} in ${ctx.jurisdiction}${ctx.city ? ` (${ctx.city})` : ""}.

II. STATEMENT OF FACTS

Nature of harm (operator-provided): ${ctx.civilHarm || "wrongful stop and detention based on ALPR / surveillance misidentification — adapt to verified client facts."}

Camera / system type: ${ctx.cameraType || "surveillance / ALPR system operated or relied upon by your agency."}

Documented civil / litigation context:
${bullets(civilFacts)}

III. LEGAL BASIS

1. Fourth Amendment — unreasonable seizure without probable cause, or based on AI / ALPR output that does not meet reliability standards.
2. 42 U.S.C. § 1983 — deprivation of constitutional rights under color of state law.
3. Parallel state tort theories as applicable (false arrest, false imprisonment, IIED).

IV. DAMAGES

Compensatory (detention time, wages, medical, property), non-economic (distress, humiliation, reputational harm), punitive where reckless or malicious, and attorney's fees under 42 U.S.C. § 1988.

Illustrative settlement ranges from public reporting: approximately $10,000–$75,000 for brief detentions; $100,000–$500,000+ for prolonged detention, physical harm, or egregious conduct — subject to attorney valuation of this client's facts.

Qualified-immunity landscape: note jurisdictions that have abolished or limited QI for state claims (e.g., Colorado, New Mexico) and active reform efforts elsewhere.

V. DEMAND

1. Preserve all ${vendorName} queries, audit logs, officer query history, and footage related to this incident.
2. Respond within 30 days with a meaningful settlement proposal or detailed factual rebuttal.
3. Failure to respond will result in filing a § 1983 complaint in federal district court.

Sources consulted for template framing:
${sources.map((s) => `- ${s}`).join("\n")}

Very truly yours,

_______________________________
Counsel for Claimant
[Attorney name — TO BE COMPLETED]

CC: Local ACLU affiliate; Institute for Justice; relevant civil-rights organizations
`;

  return { motion, accuracy, access, civil };
}
