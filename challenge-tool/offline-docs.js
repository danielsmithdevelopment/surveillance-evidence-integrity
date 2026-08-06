/**
 * Deterministic document templates used when ClawQL chat is unavailable
 * (local/dev) or as an explicit offline generation mode.
 * Production still prefers live gateway generation via gwChat.
 *
 * Branches on footageCategory: fixed_surveillance | body_worn | cellphone
 */
import {
  bodyCamRatchetLine,
  discoveryRequests,
  getFootageCategory,
  MODE_FACT_PACKS,
  normalizeBodyCamRecordingStatus,
} from "./footage-modes.js";

function bullets(items) {
  return items.map((f, i) => `${i + 1}. ${f}`).join("\n");
}

function discoveryBlock(vendorName, kind, footageCategory, recordingStatus) {
  return discoveryRequests(vendorName, kind, footageCategory, recordingStatus)
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");
}

function titles(footageCategory, vendorName, recordingStatus) {
  if (footageCategory === "body_worn") {
    if (recordingStatus === "missing") {
      return {
        motion: `MOTION FOR ADVERSE INFERENCE / EXCLUSION OF OFFICER TESTIMONY\nAND AUTHENTICATION CHALLENGE — FAILURE TO RECORD ON ${vendorName.toUpperCase()} BODY-WORN CAMERA`,
        accuracy: `MOTION TO EXCLUDE UNRELIABLE ${vendorName.toUpperCase()} BODY-WORN “SYSTEM” EVIDENCE\nUNDER FRE 702 — DUTY TO RECORD & COMPLETENESS`,
        access: `MOTION TO COMPEL / FOR SPOLIATION SANCTIONS — MISSING ${vendorName.toUpperCase()} BODY-WORN FOOTAGE\n— BRADY, DUE PROCESS & STATUTORY INFERENCES`,
        evidenceLabel: "body-worn / in-car camera footage (missing or never activated)",
        civilRe: `Constitutional claims arising from missing ${vendorName} body-worn camera footage`,
      };
    }
    if (recordingStatus === "partial") {
      return {
        motion: `MOTION IN LIMINE — PARTIAL / MUTED ${vendorName.toUpperCase()} BODY-WORN FOOTAGE\n(STAGE 1: GAPS · STAGE 2: AUTHENTICITY OF REMAINDER)`,
        accuracy: `MOTION TO EXCLUDE ${vendorName.toUpperCase()} BODY-WORN FOOTAGE / AI ASSIST OUTPUT\nUNDER FRE 702 — MUTE GAPS & COMPLETENESS`,
        access: `MOTION TO SUPPRESS / COMPEL COMPLETE ${vendorName.toUpperCase()} BODY-WORN EVIDENCE\n— FOURTH AMENDMENT, BRADY & ACTIVATION FAILURES`,
        evidenceLabel: "body-worn / in-car camera footage (partial / mute gaps)",
        civilRe: `Constitutional claims arising from incomplete ${vendorName} body-worn camera evidence`,
      };
    }
    return {
      motion: `MOTION IN LIMINE TO EXCLUDE ${vendorName.toUpperCase()} BODY-WORN / IN-CAR FOOTAGE\nFOR LACK OF AUTHENTICATION UNDER FRE 901\n(WITH FAILURE-TO-RECORD RATCHET IF ACTIVATION LOGS SHOW GAPS)`,
      accuracy: `MOTION TO EXCLUDE ${vendorName.toUpperCase()} BODY-WORN FOOTAGE / AI ASSIST OUTPUT\nUNDER FRE 702 AND DAUBERT — COMPLETENESS & RELIABILITY`,
      access: `MOTION TO SUPPRESS / COMPEL COMPLETE ${vendorName.toUpperCase()} BODY-WORN EVIDENCE\n— FOURTH AMENDMENT & BRADY`,
      evidenceLabel: "body-worn / in-car camera footage",
      civilRe: `Constitutional claims arising from ${vendorName} body-worn camera evidence`,
    };
  }
  if (footageCategory === "cellphone") {
    return {
      motion: `MOTION IN LIMINE TO EXCLUDE CELL PHONE VIDEO\nFOR LACK OF AUTHENTICATION UNDER FRE 901 (AI-ALTERATION & INTEGRITY RISK)`,
      accuracy: `MOTION TO EXCLUDE UNVERIFIED / AI-RISK CELL PHONE VIDEO\nUNDER FRE 702 AND DAUBERT`,
      access: `MOTION TO SUPPRESS CELL PHONE VIDEO / LIMIT EXTRACTION\n— FOURTH AMENDMENT (RILEY) & SELECTIVE PRODUCTION`,
      evidenceLabel: "cell phone / personal-device video",
      civilRe: `Constitutional claims arising from unverified cell phone video`,
    };
  }
  return {
    motion: `MOTION IN LIMINE TO EXCLUDE ${vendorName.toUpperCase()} SURVEILLANCE FOOTAGE\nFOR LACK OF AUTHENTICATION UNDER FRE 901`,
    accuracy: `MOTION TO EXCLUDE ${vendorName.toUpperCase()} AI / ALPR EVIDENCE\nUNDER FRE 702 AND DAUBERT`,
    access: `MOTION TO SUPPRESS EVIDENCE OBTAINED THROUGH ${vendorName.toUpperCase()}\nSURVEILLANCE — FOURTH AMENDMENT`,
    evidenceLabel: "surveillance camera footage",
    civilRe: `Constitutional claims arising from ${vendorName} surveillance`,
  };
}

export function buildOfflineDocs({ vendorName, profile, ctx, enriched }) {
  const footageCategory = ctx.footageCategory || "fixed_surveillance";
  const recordingStatus = normalizeBodyCamRecordingStatus(
    ctx.bodyCamRecordingStatus,
    footageCategory
  );
  const mode = getFootageCategory(footageCategory);
  const pack = MODE_FACT_PACKS[footageCategory] || MODE_FACT_PACKS.fixed_surveillance;
  const t = titles(footageCategory, vendorName, recordingStatus);
  const ratchet = footageCategory === "body_worn" ? bodyCamRatchetLine(recordingStatus) : "";

  const authFacts = profile?.authFacts || [
    `${vendorName} has not publicly documented cryptographic hashing of footage at capture, Merkle-chained audit logs, or external immutable anchoring.`,
  ];
  const errorFacts =
    profile?.errorRateFacts ||
    (footageCategory === "cellphone"
      ? [
          `Generative AI and consumer editors can alter phone video; without capture-time cryptographic proof, reliability under FRE 702 is not shown.`,
        ]
      : footageCategory === "body_worn"
        ? [
            `Body-worn completeness failures (non-activation, mute, dock re-encode) are reliability defects even when shown pixels appear unaltered.`,
          ]
        : [
            `Industry ALPR systems have been estimated to operate at approximately a 10% plate misread rate; DHS has acknowledged character-confusion errors without setting a minimum acceptable standard.`,
          ]);
  const accessFacts =
    profile?.accessAbuseFacts ||
    (footageCategory === "cellphone"
      ? [
          `Riley v. California constrains phone searches; selective clip production from a seized or civilian device is an independent custody problem.`,
        ]
      : footageCategory === "body_worn"
        ? [
            `Evidence-vault access/export logs that are not independently verifiable cannot reliably prove who saw or altered body-worn media.`,
          ]
        : [
            `Documented cases nationwide show officers using ALPR networks for personal purposes; FOIA-derived logs show a high share of queries without case numbers.`,
          ]);
  const civilFacts =
    profile?.civilFacts ||
    (footageCategory === "cellphone"
      ? [
          `Reliance on unverified or altered phone video to justify force or prosecution can support Fourth Amendment claims under 42 U.S.C. § 1983.`,
        ]
      : footageCategory === "body_worn"
        ? [
            `Missing or selectively retained body-worn footage that conceals force or exculpatory context supports § 1983 and spoliation theories.`,
          ]
        : [
            `Wrongful stops and detentions based on unreliable ALPR output can support Fourth Amendment claims under 42 U.S.C. § 1983.`,
          ]);
  const sources = profile?.sources || [
    "Public reporting on surveillance / digital evidence integrity",
    "Challenge the Footage — Challenge-grade capture standards",
  ];

  const caption = `IN THE ${String(ctx.court).toUpperCase()}

Case No. ${ctx.caseNumber}

${ctx.jurisdiction.toUpperCase()}
v.
${ctx.defendant.toUpperCase()},
          Defendant.
`;

  const extra = enriched ? `\n\n[Context supplied by operator / memory]\n${enriched}\n` : "";
  const pressure = pack.pressureLine;

  const motionAuthArgs =
    footageCategory === "cellphone"
      ? `7. The record does not show a cryptographic hash or content credential computed at capture on the source device.

8. The record does not show an external integrity anchor or Challenge-grade package that would let a third party detect AI alteration or silent re-encode.

9. The clip appears to have passed through consumer sharing / cloud paths that routinely destroy provenance.

10. Generative AI alteration capability is widely available. Systems that cannot independently prove integrity are not reliable under FRE 901(b)(9).

11. ${pressure}`
      : footageCategory === "body_worn" && recordingStatus === "missing"
        ? `7. STAGE 1 — FAILURE TO RECORD. Policy and, in many jurisdictions, statute required the officer to activate a body-worn camera for this encounter. No usable ${vendorName} recording was produced.

8. Where the law supplies a permissive inference that missing footage would have reflected officer misconduct, and/or a presumption of inadmissibility for unrecorded statements or conduct (e.g. Colo. § 24-31-902 as applied in People v. Havens; Ill. 50 ILCS 706/10-30 as discussed in People v. Tompkins), Defendant is entitled to those remedies unless the State rebuts with a reasonable justification.

9. Officer narrative testimony that fills the silent gap is not a substitute for the contemporaneous audiovisual record the agency chose to require — and then failed to create.

10. STAGE 2 — AUTHENTICITY RATCHET. To the extent any ${vendorName} clip later appears, or other officers' footage is offered, that media still fails FRE 901(b)(9) without hash-before-leave-device, tamper-evident activation/mute/dock logs, and verification independent of the vendor cloud.

11. ${ratchet}

12. ${pressure}`
        : footageCategory === "body_worn"
          ? `7. ${recordingStatus === "partial" ? "STAGE 1 — PARTIAL RECORDING / MUTE GAPS. Critical portions of the encounter are missing audio or video despite a duty to record continuously." : "STAGE 2 — AUTHENTICITY OF THE PRODUCED FILE."} The record does not show that ${vendorName} computes a cryptographic hash of footage within camera hardware before dock / network upload.

8. The record does not show tamper-evident mute / activation / dock logs covering every second of the encounter (including when recording was off).

9. The record does not show external immutable anchoring of integrity proofs outside ${vendorName}'s evidence cloud.

10. Undetectable alteration and silent re-encode risk is commercially documented for camera systems generally (e.g., reporting on Toka / Haaretz 2022). Body-worn clouds that are the sole oracle fail FRE 901(b)(9).

11. ${ratchet}

12. ${pressure}`
          : `7. The record does not show that ${vendorName} computes a cryptographic hash of footage within camera hardware at capture.

8. The record does not show Merkle-chained audit logs covering the segment at issue.

9. The record does not show external immutable anchoring of Merkle roots or equivalent integrity proofs outside ${vendorName}'s control.

10. The record does not show tamper-evident access logs for all queries regardless of case number.

11. Undetectable alteration capability is commercially documented (e.g., reporting on Toka / Haaretz 2022). Systems that cannot independently prove integrity are not reliable under FRE 901(b)(9).

12. ${pressure}`;

  const motionIntro =
    footageCategory === "body_worn" && recordingStatus === "missing"
      ? `1. Defendant moves for adverse-inference / statutory remedies based on the State's failure to record this encounter on a required ${vendorName} body-worn camera, and — in the alternative — to exclude any later-produced or other-officer footage that cannot be authenticated under FRE 901.

2. Relief sought: (a) permissive inference and/or presumption remedies for missing footage; (b) exclusion or limitation of officer testimony that replaces the missing record; (c) FRE 901 hearing for any audiovisual file the State still offers; (d) discovery of device audit trails proving when the camera was off.`
      : `1. Defendant moves to exclude ${vendorName} ${t.evidenceLabel} (${ctx.cameraType || mode.label}) offered by the prosecution because the system that produced it cannot be authenticated under Federal Rule of Evidence 901${
          footageCategory === "body_worn"
            ? ", and preserves Stage 1 failure-to-record remedies if activation logs show gaps"
            : ""
        }.

2. Relief sought: exclusion of the footage and all derivative testimony, or in the alternative a Daubert-style evidentiary hearing requiring live demonstration of cryptographic integrity controls.`;

  const motionFacts =
    footageCategory === "body_worn" && recordingStatus === "missing"
      ? `3. No usable ${vendorName} body-worn recording of the encounter was produced for Case ${ctx.caseNumber} in ${ctx.court}, ${ctx.jurisdiction}${ctx.city ? ` (${ctx.city})` : ""}. Camera / assignment: ${ctx.cameraType || mode.label}.

4. Operator facts on the missing recording: ${ctx.searchFacts || "not specified — discovery will establish activation duty, device audit trail, and any claimed malfunction."}

5. Documented integrity / duty-to-record context:
${bullets(authFacts)}
${extra}`
      : `3. The prosecution intends to introduce ${t.evidenceLabel} from ${vendorName} relating to Case ${ctx.caseNumber} in ${ctx.court}, ${ctx.jurisdiction}${ctx.city ? ` (${ctx.city})` : ""}.

4. Documented integrity gaps:
${bullets(authFacts)}
${extra}`;

  const motion = `${caption}
${t.motion}

I. INTRODUCTION

${motionIntro}

II. FACTUAL BACKGROUND

${motionFacts}
III. LEGAL STANDARD

${
  footageCategory === "body_worn" && recordingStatus === "missing"
    ? `6. Agencies that mandate body-worn cameras create a duty to generate a contemporaneous record. Failure to activate or unmute may trigger statute-specific inferences and presumptions (see Havens; Tompkins) and due-process / Brady concerns when the missing media would have been material.

7. Separately, FRE 901(a) and 901(b)(9) still govern any footage the State offers from ${vendorName} or other devices — vendor assertion is not independent verification.`
    : `5. FRE 901(a) requires evidence sufficient to support a finding that the item is what the proponent claims. FRE 901(b)(9) addresses evidence describing a process or system and showing that it produces an accurate result.

6. Vendor or device-owner assertion is not a substitute for independently verifiable process reliability.`
}

IV. ARGUMENT

${motionAuthArgs}

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "auth", footageCategory, recordingStatus)}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant respectfully requests that the Court:
A. ${
    footageCategory === "body_worn" && recordingStatus === "missing"
      ? "Apply adverse-inference / statutory presumption remedies for the missing body-worn recording and limit officer testimony that fills the gap;"
      : `Exclude the ${vendorName} footage and related identification evidence;`
  }
B. Or, in the alternative, convene an evidentiary hearing requiring demonstration of cryptographic integrity controls${
    footageCategory === "body_worn"
      ? " and production of activation / mute / dock audit trails"
      : ""
  } through independent verification;
C. Grant such other relief as the Court deems just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name, bar number, contact — TO BE COMPLETED]
`;

  const accuracyBody =
    footageCategory === "cellphone"
      ? `III. THE AI-ALTERATION AND OVER-TRUST PROBLEM

3. Documented reliability concerns:
${bullets(errorFacts)}

4. Proposed minimum for phone video used to prove guilt: either (a) a capture-time cryptographic commitment / content credential verifiable by the defense, or (b) exclusion / limiting instruction — courts should not ask juries to "just watch the video" when provenance is unproven.

IV. ARGUMENT

5. The proponent has not demonstrated the clip is free of generative AI alteration, silent re-encode, or selective clipping.

6. Juror over-trust of video magnifies FRE 403 prejudice when FRE 702 reliability is unmet.

7. Challenge-grade civilian capture exists; refusing similar proof for accusatory phone video is a double standard.`
      : footageCategory === "body_worn" && recordingStatus === "missing"
        ? `III. THE DUTY-TO-RECORD / SYSTEM RELIABILITY PROBLEM

3. Documented reliability concerns:
${bullets(errorFacts)}

4. A body-worn program that fails to capture required encounters is not a reliable process under FRE 702 / Daubert — the "system" includes activation compliance, not only the pixels when a file happens to exist.

5. Proposed minimum: mandatory activation with tamper-evident on/off/mute logs, hash-before-leave-device, and Challenge-grade export — so non-recording is itself cryptographically and administratively auditable.

IV. ARGUMENT

6. The State cannot rely on an unreliable recording regime to prove what occurred during the silent interval.

7. ${ratchet}`
        : footageCategory === "body_worn"
          ? `III. THE COMPLETENESS / RELIABILITY PROBLEM

3. Documented reliability concerns (${pack.accuracyFrame}):
${bullets(errorFacts)}

4. Proposed minimum for body-worn evidence used in criminal prosecution: hash-before-leave-device, tamper-evident activation/mute/dock logs, and production of the complete multi-officer set — independently verifiable, not solely via the vendor portal.

IV. ARGUMENT

5. ${vendorName} has not demonstrated that the produced segment is the complete, unaltered camera output for the encounter.

6. Partial clips and AI-assist descriptions are technical evidence requiring a FRE 702 reliability showing.

7. Non-activation and mute gaps are themselves material; a system that cannot prove when recording was off fails process reliability under Daubert.

8. ${ratchet}`
          : `III. THE ERROR-RATE PROBLEM

3. Documented accuracy concerns:
${bullets(errorFacts)}

4. Proposed minimum reliability threshold for evidence used to initiate stops, detentions, or prosecutions: no worse than 1 error per 1,000 reads (0.1%), independently verified by a neutral third party — two orders of magnitude better than commonly cited industry plate-misread performance.

IV. ARGUMENT

5. ${vendorName} has not demonstrated through independent testing that its system meets that threshold for the conditions present in this case.

6. No clear judicial consensus yet defines an acceptable error rate for AI-generated surveillance evidence used in criminal prosecution; gatekeeping under Daubert still requires a reliability showing.

7. Character-confusion errors (0/O, 1/I, and similar) are a known failure mode producing wrongful stops.`;

  const accuracy = `${caption}
${t.accuracy}

I. INTRODUCTION

1. Independent of authentication, Defendant moves to exclude ${vendorName} ${t.evidenceLabel} / derived AI output as unreliable under FRE 702 and Daubert v. Merrell Dow Pharmaceuticals.

II. LEGAL STANDARD

2. FRE 702 requires reliable principles and methods, reliably applied. The Court is the gatekeeper for scientific and technical evidence, including AI identification systems and digital video offered as proof of what occurred.

${accuracyBody}

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "accuracy", footageCategory, recordingStatus)}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant requests exclusion of the challenged evidence, or an evidentiary hearing requiring production of independent reliability testing / integrity proofs, and such other relief as is just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name — TO BE COMPLETED]
`;

  const accessBody =
    footageCategory === "cellphone"
      ? `III. SEIZURE, EXTRACTION, AND SELECTIVE PRODUCTION

3. Documented custody / access failures:
${bullets(accessFacts)}

4. Specific search / seizure facts (operator-provided): ${ctx.searchFacts || "not specified — discovery is required to establish warrant theory, extraction scope, and whether related clips were withheld."}

IV. ARGUMENT

5. Under Riley, warrantless or overbroad phone extraction is presumptively unreasonable; evidence derived therefrom is suppressible.

6. Even with a warrant, selective production of a single clip from a device that held related media violates due process / Brady principles when exculpatory neighbors are withheld.

7. Without hash-linked chain of custody from device to exhibit, the court cannot distinguish authentic originals from AI-altered or re-encoded copies.`
      : footageCategory === "body_worn" && recordingStatus === "missing"
        ? `III. SPOLIATION / BRADY — MISSING REQUIRED RECORDING

3. Documented access / activation failures:
${bullets(accessFacts)}

4. Specific facts on the missing recording (operator-provided): ${ctx.searchFacts || "not specified — discovery must establish duty to activate, device audit trail, and any claimed malfunction."}

IV. ARGUMENT

5. When policy required a recording and none exists, the missing media is potentially Brady material destroyed or never created; spoliation sanctions and adverse inferences are appropriate.

6. Compel production of the ${vendorName} device audit trail — event-button presses, mute, dock, battery — so the Court can see when the camera was off.

7. ${ratchet}

8. ${pressure}`
        : footageCategory === "body_worn"
          ? `III. EVIDENCE-VAULT ACCESS AND COMPLETENESS

3. Documented access / retention failures:
${bullets(accessFacts)}

4. Specific access facts (operator-provided): ${ctx.searchFacts || "not specified — discovery is required to establish who exported the file, mute/activation status, and whether multi-officer video was withheld."}

IV. ARGUMENT

5. Body-worn footage is agency-controlled evidence; incomplete production or unverifiable vault logs undermine any claim that the jury has the true record of the encounter.

6. Failure-to-activate and mute abuse are Fourth Amendment / due process issues when force or detention is at stake.

7. ${ratchet}

8. ${pressure}`
          : `III. ACCESS-ABUSE PATTERN

3. Documented abuse and control failures:
${bullets(accessFacts)}

4. Specific search facts (operator-provided): ${ctx.searchFacts || "not specified — discovery is required to establish purpose, case number, and authorization for the query at issue."}

IV. ARGUMENT

5. Without a documented case number, stated law-enforcement purpose, and verifiable authorization chain, the search producing evidence against ${ctx.defendant} cannot be distinguished from the documented pattern of unauthorized personal use.

6. Where ${vendorName} (or equivalent ALPR) hits were used to reconstruct interstate or multi-camera travel patterns and retrofit that pattern into probable cause — including travel to activity that is lawful in another state — the stop is a mass-surveillance pretext stop. Whren v. United States does not immunize dragnet behavioral profiling; counsel should preserve aggregate-location-privacy and particularity arguments for appellate review.

7. Where departmental SOPs or federal guidance instruct officers not to mention ALPR usage to occupants or in reports/complaints (or to be "as vague as permissible" because searches are public-records-discoverable), concealment of material ALPR reliance supports bad-faith and Franks v. Delaware challenges to any affidavit or charging narrative that omits the surveillance basis.

8. Systemic access-control failures and incomplete audit trails undermine reliance on vendor-controlled logs to justify the search.`;

  const access = `${caption}
${t.access}

I. INTRODUCTION

1. Defendant moves to suppress or limit ${vendorName} ${t.evidenceLabel} on Fourth Amendment and related due-process grounds (${pack.accessFrame}).

II. LEGAL STANDARD

2. Warrantless searches require a legitimate law-enforcement purpose. Evidence from unconstitutional searches is subject to the exclusionary rule (Mapp v. Ohio and progeny). Digital evidence systems that initiate stops or omit exculpatory context are subject to constitutional scrutiny.

${accessBody}

V. DISCOVERY REQUESTS

${discoveryBlock(vendorName, "access", footageCategory, recordingStatus)}

VI. PRAYER FOR RELIEF

WHEREFORE, Defendant requests suppression or complete production with integrity proofs, and such other relief as is just.

Respectfully submitted,

_______________________________
Counsel for Defendant
[Attorney name — TO BE COMPLETED]
`;

  const civilHarmDefault =
    footageCategory === "cellphone"
      ? "harm from reliance on unverified or altered cell phone video — adapt to verified client facts."
      : footageCategory === "body_worn" && recordingStatus === "missing"
        ? "harm from the agency's failure to record a required body-worn encounter (force, detention, or other constitutional injury) — adapt to verified client facts."
        : footageCategory === "body_worn"
          ? "harm from incomplete / missing body-worn video or force captured on vendor systems — adapt to verified client facts."
          : "wrongful stop and detention based on ALPR / surveillance misidentification — adapt to verified client facts.";

  const civil = `DEMAND LETTER — 42 U.S.C. § 1983
================================

Date: ${new Date().toISOString().slice(0, 10)}

VIA EMAIL AND CERTIFIED MAIL

City / County Attorney
Police Department / Contracting Agency
${ctx.city || ctx.jurisdiction}

Re: ${t.civilRe} — ${ctx.defendant} / Case ${ctx.caseNumber}

Dear Counsel:

I. OPENING

This letter states claims under the Fourth Amendment and 42 U.S.C. § 1983 arising from the use of ${vendorName} ${t.evidenceLabel} against ${ctx.defendant} in ${ctx.jurisdiction}${ctx.city ? ` (${ctx.city})` : ""}.

II. STATEMENT OF FACTS

Nature of harm (operator-provided): ${ctx.civilHarm || civilHarmDefault}

Camera / system type: ${ctx.cameraType || mode.label}.

Documented civil / litigation context:
${bullets(civilFacts)}

Integrity pressure (Challenge-grade):
${pressure}
${ratchet ? `\n${ratchet}\n` : ""}

III. LEGAL BASIS

1. Fourth Amendment — unreasonable seizure and/or reliance on digital evidence that does not meet authenticity / reliability standards.
2. 42 U.S.C. § 1983 — deprivation of constitutional rights under color of state law.
3. Parallel state tort theories as applicable (false arrest, false imprisonment, IIED, spoliation where recognized).

IV. DAMAGES

Compensatory (detention time, wages, medical, property), non-economic (distress, humiliation, reputational harm), punitive where reckless or malicious, and attorney's fees under 42 U.S.C. § 1988.

Illustrative settlement ranges from public reporting: approximately $10,000–$75,000 for brief detentions; $100,000–$500,000+ for prolonged detention, physical harm, or egregious conduct — subject to attorney valuation of this client's facts.

Qualified-immunity landscape: note jurisdictions that have abolished or limited QI for state claims (e.g., Colorado, New Mexico) and active reform efforts elsewhere.

V. DEMAND

1. Preserve all ${vendorName} media, audit / access logs, device images, and related exports for this incident.
2. Produce capture-time integrity proofs (hashes / content credentials / Challenge-grade packages) or admit they do not exist.
3. Respond within 30 days with a meaningful settlement proposal or detailed factual rebuttal.
4. Failure to respond will result in filing a § 1983 complaint in federal district court.

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
