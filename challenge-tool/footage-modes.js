/**
 * Three capture classes — same integrity pressure, different failure modes.
 *
 * fixed_surveillance — ALPR / fixed CCTV (Flock-like)
 * body_worn          — police body cams / in-car video
 * cellphone          — personal or officer phone video (AI-alteration risk)
 */

export const FOOTAGE_CATEGORIES = [
  {
    id: "fixed_surveillance",
    label: "Fixed / ALPR surveillance",
    shortLabel: "Fixed / ALPR",
    description: "Stationary cameras and license-plate readers (Flock, Vigilant, municipal CCTV).",
    defaultVendor: "flock",
    vendorIds: ["flock", "motorola", "genetec", "verkada", "axon", "custom"],
    cameraPlaceholder: "e.g. Flock Falcon ALPR, fixed CCTV intersection cam",
    searchPlaceholder: "Case number on the query? Stated purpose? Officer query history if known…",
    civilPlaceholder: "Wrongful stop, detention at gunpoint, arrest, lost wages, injury…",
    sourceLabel: "Vendor",
  },
  {
    id: "body_worn",
    label: "Body-worn / in-car camera",
    shortLabel: "Body cam",
    description:
      "Police body-worn cameras and fleet/dash cameras managed in vendor evidence clouds.",
    defaultVendor: "axon",
    vendorIds: ["axon", "motorola", "custom"],
    cameraPlaceholder: "e.g. Axon Body 3, Axon Fleet 3, WatchGuard, in-car DVR",
    searchPlaceholder:
      "Was the cam activated? Mute/buffer gaps? Who exported from Evidence.com? Retention policy…",
    civilPlaceholder:
      "Excessive force, missing activation, selective mute, wrongful arrest aided by incomplete video…",
    sourceLabel: "Body-cam vendor",
  },
  {
    id: "cellphone",
    label: "Cell phone / personal device",
    shortLabel: "Cell phone",
    description:
      "Smartphone video offered by prosecution or witnesses — including AI-edit and cloud re-export risk.",
    defaultVendor: "cellphone",
    vendorIds: ["cellphone", "custom"],
    cameraPlaceholder: "e.g. iPhone 15, Android, WhatsApp re-export, officer phone",
    searchPlaceholder:
      "How was the phone seized or obtained? Extraction tool? Cloud backup? Original file vs share-sheet export?",
    civilPlaceholder:
      "Arrest or charge based on unverified phone video; deepfake / edited clip; privacy invasion…",
    sourceLabel: "Footage source",
  },
];

export const FOOTAGE_CATEGORY_IDS = FOOTAGE_CATEGORIES.map((c) => c.id);

/**
 * Body-cam recording posture — Stage 1 (duty / failure to record) then Stage 2 (authenticity).
 * Agencies often require activation for public contacts; statutes increasingly attach inferences.
 */
export const BODY_CAM_RECORDING_STATUSES = [
  {
    id: "missing",
    label: "No usable recording (never activated / camera off)",
    stage:
      "Stage 1 primary — duty to record violated; adverse inference / statutory presumption; then Stage 2 authenticity for any later-produced or other-officer video",
  },
  {
    id: "partial",
    label: "Partial / mute gaps / late activation",
    stage: "Stage 1 for the gaps + Stage 2 authenticity of whatever fragment remains",
  },
  {
    id: "recorded",
    label: "Recording exists (challenge authenticity / completeness)",
    stage:
      "Stage 2 primary — FRE 901 integrity of the file; keep Stage 1 ready if activation logs show gaps",
  },
];

export const BODY_CAM_RECORDING_STATUS_IDS = BODY_CAM_RECORDING_STATUSES.map((s) => s.id);

export function getFootageCategory(id) {
  return FOOTAGE_CATEGORIES.find((c) => c.id === id) || FOOTAGE_CATEGORIES[0];
}

export function normalizeBodyCamRecordingStatus(status, footageCategory) {
  if (footageCategory !== "body_worn") return null;
  if (BODY_CAM_RECORDING_STATUS_IDS.includes(status)) return status;
  return "recorded";
}

export function bodyCamRatchetLine(status) {
  const s =
    BODY_CAM_RECORDING_STATUSES.find((x) => x.id === status) || BODY_CAM_RECORDING_STATUSES[2];
  return `Pressure ratchet: ${s.stage}. Full auditability (hash-before-leave-device, tamper-evident activation/mute/dock logs, third-party verifiable export) is the only durable answer to both stages.`;
}

/**
 * Body-worn baseline facts (merged into any BWC vendor profile).
 * Parallel to Flock FOIA / IJ documentation for fixed cams.
 */
export const BODY_WORN_BASELINE = {
  authFacts: [
    "Body-worn systems commonly buffer, mute, and dock-upload through vendor clouds; without a cryptographic commitment before media leaves the camera, docking and cloud re-encode are integrity breakpoints.",
    "Colorado's statewide BWC statute creates a permissive inference that missing footage would have reflected officer misconduct, plus a rebuttable presumption of inadmissibility for unrecorded statements/conduct when an officer fails to activate or unmute as required — People v. Havens, 2025 CO 72 (interpreting § 24-31-902(1)(a)(III), C.R.S.).",
    "Illinois's Law Enforcement Officer-Worn Body Camera Act likewise treats intentional non-recording as a jury-weight issue the defense may raise — People v. Tompkins, 2023 IL 127805 (discussing 50 ILCS 706/10-30).",
    "Evidence management platforms (e.g. Axon Evidence / Evidence.com) are typically the sole oracle for access and export history; NACDL materials urge defense counsel to demand the evidence audit trail and device audit trail whenever footage is produced.",
    "In NYPD civil litigation, the City sought extensions because bulk Evidence.com audit-trail production required simultaneously downloading every associated video and Axon had not resolved technical errors — illustrating that 'immutable audit logs' are still vendor-mediated and hard for outsiders to obtain at scale (S.D.N.Y. letters, Feb. 2022).",
  ],
  errorRateFacts: [
    "Chicago's Civilian Office of Police Accountability reviewed 186 BWC non-compliance allegations across a sample of investigations opened in a defined period and sustained non-compliance in 68 (≈37%), including serious underlying incidents where missing video was especially material (COPA Report on Non-Compliance with Body-Worn Camera Regulations, 2021).",
    "CBS 2 Chicago's 'Left in the Dark' investigation of CPD's own data found tens of thousands of everyday encounters that policy said should have been recorded were never captured, with little evidence of meaningful discipline.",
    "Body-worn 'accuracy' for criminal proof is primarily completeness and fidelity: missing activation, mute gaps, and dock/cloud re-encode can omit the decisive seconds even when shown pixels appear unaltered.",
    "Vendor AI tools (auto-transcribe, redaction, search) introduce secondary model-error risk when the state relies on AI-derived descriptions of what the video shows.",
  ],
  accessAbuseFacts: [
    "In Billings, Montana (May 2023 stop), body-cam video and disciplinary records showed officers discussing cameras, removing a camera so recording went dark, and turning cameras off during conversations about a consent search — prompting prosecutors to review nearly 180 related criminal cases; one officer was later terminated (MTN News / KPAX reporting).",
    "A Scottsdale city audit of an Axon/Evidence.com deployment found former employees still had system access (including one with full admin rights), supervisors skipping required reviews, and videos deleted without required documentation — agency-side custody failures independent of vendor marketing claims.",
    "Who could view, share, or export a body-worn file from the evidence vault — and whether those events are independently verifiable — is the body-cam analogue of ALPR query abuse.",
    "Retention and automatic deletion policies can destroy Brady material; discovery must lock preservation immediately.",
  ],
  civilFacts: [
    "Incomplete or selectively retained body-worn footage that conceals force or exculpatory context supports § 1983 theories and spoliation arguments; state BWC statutes increasingly attach evidentiary consequences (Colorado inference/presumption; Illinois Act) that civil plaintiffs can also cite.",
    "Wrongful arrest / excessive-force settlements frequently turn on what body-worn video shows — or fails to show — making integrity and completeness controls material to civil exposure.",
  ],
  sources: [
    "People v. Havens, 2025 CO 72; Colo. Rev. Stat. § 24-31-902(1)(a)(III)",
    "People v. Tompkins, 2023 IL 127805; 50 ILCS 706/10-20, 10-30",
    "Chicago COPA — Report on Non-Compliance with Body-Worn Camera Regulations (2021)",
    "CBS 2 Chicago — Left in the Dark: The Failed Promise of Chicago Police Body Cameras",
    "MTN News / KPAX — Billings police body-cam 'hidden consent' reporting (2023–2024)",
    "Scottsdale city audit / Arizona Republic reporting on Evidence.com access and deletion gaps (2018)",
    "NACDL Champion — Harlan Yu on Evidence.com audit trails (July 2019)",
    "S.D.N.Y. City letters on Evidence.com audit-trail production difficulties (Feb. 2022)",
    "Challenge the Footage — Challenge-grade / clawql-surveillance integrity bar",
  ],
};

/** Built-in profile when challenging cellphone footage (not a camera vendor). */
export const CELLPHONE_PROFILE = {
  name: "cellphone footage",
  authFacts: [
    "Consumer smartphones do not, by default, produce independently verifiable cryptographic commitments of video at the moment of capture that a third party can check without trusting the device owner or cloud vendor.",
    "In Mendones v. Cushman & Wakefield (Alameda County Superior Court, Sept. 2025), the court dismissed a civil case with prejudice after finding plaintiffs submitted an AI-generated deepfake video and other generative-AI-altered exhibits; the court scrutinized metadata claiming an iPhone 6 capture that could not support the AI explanation offered (Law.com / The Recorder; EDRM summary).",
    "Common distribution paths — Messages, WhatsApp, Snapchat, iCloud/Google Photos re-export — re-encode video, strip or rewrite metadata, and break informal chain of custody; State v. Puloka involved Snapchat-sourced iPhone video of a shooting later subjected to AI 'enhancement.'",
    "EXIF / file-system timestamps and 'original filename' claims are trivially spoofable and are not a substitute for a cryptographic integrity regime — as the Mendones metadata analysis illustrates.",
    "Challenge-grade capture (hash at capture, on-device transcript commitment, optional external anchor) exists for civilian phones; footage that lacks those controls should not receive a reliability presumption in court.",
  ],
  errorRateFacts: [
    "State v. Puloka, No. 21-1-04851-2 KNT (King County Super. Ct., Wash., Mar. 29, 2024) — widely reported as a first-of-its-kind U.S. criminal ruling — excluded AI-enhanced cellphone/Snapchat video under Washington's Frye standard and ER 702/403; forensic analyst Grant Fredericks testified the AI tool added and removed visual data not in the original (NBC News, Apr. 2024).",
    "Topaz Labs, whose AI enhancement tool was at issue in Puloka, publicly warned against forensic use of the product (statement reported by NBC News).",
    "The Judicial Conference Advisory Committee on Evidence Rules has drafted a working Rule 901(c) on generative-AI fabrication / deepfakes (burden-shifting authenticity), holding it in abeyance while monitoring case law (Committee reports May 2025 / 2026).",
    "Human viewers systematically over-trust video relative to other evidence ('seeing is believing'), amplifying FRE 403 prejudice when provenance is unproven — a theme in deepfake scholarship and the Mendones terminating sanction.",
  ],
  accessAbuseFacts: [
    "Riley v. California, 573 U.S. 373 (2014), recognizes the uniquely invasive nature of cellphone searches; warrantless or overbroad extractions raise independent Fourth Amendment issues when law enforcement offers phone video.",
    "Selective production of a single clip from a device that held hours of related media is an access/custody problem — the proponent controls which seconds the fact-finder sees.",
    "Courts have treated bare 'this might be a deepfake' objections as going to weight when independent corroboration exists (e.g. Jan. 6 cases United States v. Doolin; United States v. Reffitt) — which is why the defense should demand affirmative cryptographic provenance, not rely on speculation alone.",
    "When an officer records on a personal phone outside the department body-cam policy, retention, audit, and Brady obligations are frequently undefined.",
  ],
  civilFacts: [
    "Mendones shows courts will terminate litigation and deter parties who offer deepfake / AI-fabricated audiovisual evidence; the same authenticity gap justifies aggressive FRE 901 gatekeeping when the state or a civil plaintiff relies on unverified phone video.",
    "Publishing or relying on unverified or altered phone video to justify force, detention, or prosecution can support Fourth Amendment and reputational tort theories under 42 U.S.C. § 1983 and state law.",
    "Agencies that accept civilian phone clips as investigative gospel without integrity controls externalize deepfake and edit risk onto defendants.",
  ],
  sources: [
    "Riley v. California, 573 U.S. 373 (2014)",
    "State v. Puloka (King County Super. Ct., Wash., Mar. 29, 2024); NBC News reporting (Apr. 2, 2024)",
    "Mendones v. Cushman & Wakefield (Alameda County Super. Ct., Sept. 2025); Law.com / The Recorder; EDRM",
    "Advisory Committee on Evidence Rules — reports on deepfakes / draft Rule 901(c) (2024–2026)",
    "United States v. Doolin; United States v. Reffitt (D.D.C.) — deepfake objections and corroboration",
    "Challenge the Footage — Challenge-grade capture (hash at capture, verifiable export)",
    "C2PA / content credentials industry materials (emerging provenance standards)",
  ],
};

/** Mode-level facts merged on top of (or instead of) vendor profiles. */
export const MODE_FACT_PACKS = {
  fixed_surveillance: {
    pressureLine:
      "Fixed / ALPR vendors that cannot prove hash-at-capture, Merkle/audit integrity, and case-numbered access should face FRE 901 / 702 exclusion — the same bar Challenge-grade systems meet.",
    authExtra: [],
    accuracyFrame: "ALPR / AI identification reliability",
    accessFrame: "network query abuse and case-number gaps",
  },
  body_worn: {
    pressureLine:
      "Body-worn camera vendors should integrate Challenge-grade controls (hash before leave-device, mute/dock/export audit, third-party verifiable export — e.g. clawql-surveillance class integrity) or face the same FRE 901 pressure as fixed surveillance — backed by Colorado/Illinois statutory consequences for missing footage and documented activation failures in Chicago, Billings, and Evidence.com audits.",
    authExtra: BODY_WORN_BASELINE.authFacts,
    accuracyFrame: "completeness, activation gaps, and AI assist tools — not plate OCR",
    accessFrame: "evidence-vault access, export, retention, and Brady completeness",
  },
  cellphone: {
    pressureLine:
      "Cell phone footage offered to prove guilt should require cryptographic proof it has not been AI-altered or silently re-encoded — Challenge-grade capture on civilian phones sets the floor the prosecution must meet or exceed.",
    authExtra: CELLPHONE_PROFILE.authFacts,
    accuracyFrame: "AI alteration, selective clipping, and over-trust of video",
    accessFrame: "device seizure, extraction scope, and selective clip production",
  },
};

export function resolveFootageProfile(footageCategory, vendorKey, vendorProfile, customName) {
  const mode = getFootageCategory(footageCategory);
  const pack = MODE_FACT_PACKS[mode.id] || MODE_FACT_PACKS.fixed_surveillance;

  if (mode.id === "cellphone" && (vendorKey === "cellphone" || !vendorProfile)) {
    return {
      mode,
      pack,
      vendorName: customName || CELLPHONE_PROFILE.name,
      profile: {
        ...CELLPHONE_PROFILE,
        authFacts: [...CELLPHONE_PROFILE.authFacts],
        errorRateFacts: [...CELLPHONE_PROFILE.errorRateFacts],
        accessAbuseFacts: [...CELLPHONE_PROFILE.accessAbuseFacts],
        civilFacts: [...CELLPHONE_PROFILE.civilFacts],
        sources: [...CELLPHONE_PROFILE.sources],
      },
    };
  }

  const base = vendorProfile
    ? {
        name: vendorProfile.name,
        authFacts: [...(vendorProfile.authFacts || [])],
        errorRateFacts: [...(vendorProfile.errorRateFacts || [])],
        accessAbuseFacts: [...(vendorProfile.accessAbuseFacts || [])],
        civilFacts: [...(vendorProfile.civilFacts || [])],
        droneFacts: [...(vendorProfile.droneFacts || [])],
        sources: [...(vendorProfile.sources || [])],
      }
    : null;

  if (base && pack.authExtra?.length) {
    // Prepend mode-specific integrity pressure without dropping vendor facts.
    base.authFacts = [...pack.authExtra, ...base.authFacts];
  }

  if (mode.id === "body_worn" && base) {
    const vendorOnlyErrors = (base.errorRateFacts || []).filter(
      (f) => !/ALPR|plate misread/i.test(f)
    );
    const vendorOnlyAccess = (base.accessAbuseFacts || []).filter(
      (f) => !/ALPR|license plate|Flock search/i.test(f)
    );
    base.errorRateFacts = [...BODY_WORN_BASELINE.errorRateFacts, ...vendorOnlyErrors];
    base.accessAbuseFacts = [...BODY_WORN_BASELINE.accessAbuseFacts, ...vendorOnlyAccess];
    base.civilFacts = [...BODY_WORN_BASELINE.civilFacts, ...(base.civilFacts || [])];
    base.sources = [...BODY_WORN_BASELINE.sources, ...(base.sources || [])];
  }

  return {
    mode,
    pack,
    vendorName: base?.name || customName || "the footage source",
    profile: base,
  };
}

/** Mode-specific discovery requests (10 each) for offline + prompt guidance. */
export function failureToRecordDiscovery(vendorName) {
  return [
    `Department body-worn camera policy and state statute (if any) requiring activation for the type of encounter at issue, including sanctions for non-activation.`,
    `Device audit trail for the involved officer's ${vendorName} camera covering the shift: power on/off, docking, event-button presses, mute toggles, battery state, and any automatic-activation triggers (holster, lights, siren).`,
    `Explanation — under oath — for why no recording (or no audio / late activation) exists for the encounter with ${vendorName} device(s) assigned that day.`,
    `All other officers' body-worn / in-car footage of the same incident, including those who did activate.`,
    `CAD/RMS timestamps for the call versus camera activation timestamps; identify every minute that should have been recorded under policy.`,
    `Prior complaints, IA findings, or discipline for the involved officer(s) regarding BWC non-activation or mute abuse.`,
    `Agency-wide activation-compliance audits for the prior 12 months (COPA/OIG-style reports if any).`,
    `Whether the jurisdiction recognizes a permissive inference or presumption of inadmissibility for missing BWC footage (e.g. Colo. § 24-31-902; Ill. 50 ILCS 706/10-30) and the agency's training on those consequences.`,
    `Any personal-phone or third-party recordings of the same incident that the agency obtained or reviewed.`,
    `Preservation hold confirming the camera, dock logs, and Evidence.com (or equivalent) metadata have not been purged.`,
  ];
}

export function discoveryRequests(vendorName, kind, footageCategory, recordingStatus) {
  const mode = footageCategory || "fixed_surveillance";

  if (mode === "body_worn" && (recordingStatus === "missing" || recordingStatus === "partial")) {
    if (kind === "auth" || kind === "access") {
      // Stage 1 discovery: duty to record + device audit trail (then vault for access).
      const fail = failureToRecordDiscovery(vendorName);
      if (kind === "auth") return fail;
      return [
        ...fail.slice(0, 7),
        `Complete evidence-vault access / share / export log for the case file for 90 days surrounding the incident.`,
        `List of roles/accounts with permission to permanently delete footage or metadata.`,
        `Communications with ${vendorName} about preservation holds for this case.`,
      ];
    }
  }

  if (mode === "body_worn") {
    const blocks = {
      auth: [
        `All cryptographic hashing, signing, or integrity-check mechanisms applied to ${vendorName} body-worn / in-car footage at or before the media left the camera hardware (including during mute, buffer, and pre-event recording).`,
        `Documentation of any Merkle tree, hash chain, or external immutable anchor for ${vendorName} evidence packages independent of the vendor evidence cloud.`,
        `Complete activation, deactivation, mute, cover, and docking event logs for the officer(s) and device(s) at issue, with tamper-evident properties if any.`,
        `Policies and technical controls for docking-station upload, cloud re-encode, redaction, and export from the evidence management platform.`,
        `Firmware and evidence-app version history for the camera and dock for the 24 months preceding the incident.`,
        `Any internal or third-party assessment of undetectable alteration, selective deletion, or silent re-encode of ${vendorName} body-worn media.`,
        `Vendor contracts and representations to the agency concerning authenticity, retention, and independent audit rights (including whether Challenge-grade / clawql-surveillance-class controls were required).`,
        `Chain-of-custody from camera buffer → dock → cloud → production in this case, including every re-wrap or transcode.`,
        `Identity of every person who viewed, shared, downloaded, or redacted the segment(s) at issue.`,
        `Configuration showing whether the camera computed a hash before network transmission; if not, an admission that no such control exists.`,
      ],
      accuracy: [
        `All testing of completeness: buffer length, automatic activation triggers, failure-to-record rates, and mute-gap statistics for ${vendorName} devices used by this agency.`,
        `Independent studies of whether ${vendorName} AI transcription / redaction / search tools misdescribe use-of-force or omit material audio.`,
        `Incident reports where missing or partial body-worn video affected charging, discipline, or civil claims.`,
        `Training materials on when officers must activate cameras and sanctions for non-activation.`,
        `Settings for pre-event buffer, audio mute authorization, and category tagging on the capture date.`,
        `Comparison exports: original camera encoding versus cloud-stored proxy used in discovery.`,
        `Any A/B tests showing quality or completeness regression after firmware updates.`,
        `Documentation of lens obstruction, mounting failures, or known blind spots for the device model.`,
        `Metrics for how often critical force incidents lack usable video from the involved officer.`,
        `Validation data for any AI assist feature the state intends to cite about what the video shows.`,
      ],
      access: [
        `Complete evidence-vault access / share / export log for the case file and for the involved officers for 90 days surrounding the incident.`,
        `All exports of the segment(s) at issue, including destination, actor, and whether a hash was recorded at export.`,
        `Department body-worn camera policy, retention schedule, and any auto-deletion that could destroy Brady material.`,
        `Prior complaints or investigations involving failure to activate, mute abuse, or evidence tampering with ${vendorName} devices.`,
        `List of roles/accounts with permission to edit metadata, restrict access, or permanently delete footage.`,
        `Audit trail for redacted versions versus unredacted masters.`,
        `Communications with ${vendorName} about preservation holds for this case.`,
        `Whether prosecutors received the complete multi-officer multi-angle set or a curated subset.`,
        `Integration logs if CAD/RMS auto-tagged or filtered the evidence package.`,
        `Any personal-device recordings by involved officers that were not ingested into ${vendorName}.`,
      ],
    };
    return blocks[kind];
  }

  if (mode === "cellphone") {
    const label = vendorName || "the cellphone";
    const blocks = {
      auth: [
        `The original camera-roll file (or equivalent) in the codec/container written by the device camera pipeline — not a Messages/WhatsApp/social re-export — plus full filesystem and cloud-version metadata.`,
        `Any cryptographic hash, content credential (e.g. C2PA), hardware attestation, or Challenge-grade capture package associated with the recording at or near capture time.`,
        `Identification of every system that re-encoded, trimmed, stabilized, or filtered the clip between capture and production.`,
        `Device make/model/OS build, camera app version, and whether any generative AI or 'enhance' feature was available/enabled.`,
        `iCloud/Google Photos/OneDrive backup logs showing upload, edit, and share events for the item.`,
        `Hash of the file as first collected by law enforcement and hash of the file produced in discovery; explain any mismatch.`,
        `Expert forensic imaging notes for the handset or extraction tool (Cellebrite, GrayKey, etc.) if LE collected the device.`,
        `All intermediate copies (SD card, email, AirDrop, USB) with custodians and timestamps.`,
        `Any admission that no capture-time integrity proof exists; if so, the proponent's theory for defeating AI-alteration / edit risk.`,
        `Comparison opportunity: produce the device or a verified bit-for-bit image for defense hash verification.`,
      ],
      accuracy: [
        `Whether the proponent claims the clip is free of generative AI alteration, and the technical basis for that claim.`,
        `All editing applications installed on the source device in the 30 days surrounding capture.`,
        `Frame-level analysis for splice points, asynchronous AV drift, GAN/deepfake indicators, and re-encode signatures.`,
        `Identification of missing pre/post seconds relative to the full camera-roll neighbor files.`,
        `Any enhancement, slow-motion, or AI upscaling applied before the jury copy was made.`,
        `Compression settings for each distribution hop and known artifact introduction.`,
        `Prior instances where this agency offered phone video later shown to be incomplete or edited.`,
        `Validation methodology if an AI tool was used to 'clarify' faces, plates, or audio.`,
        `Human-factors literature the state relies on regarding juror over-trust of video.`,
        `If the state refuses Challenge-grade verification, the alternative reliability showing under FRE 702.`,
      ],
      access: [
        `Warrant / consent / exception theory for any seizure or search of the phone (Riley grounding).`,
        `Extraction scope: full filesystem vs targeted app folders; filter criteria used by examiners.`,
        `All cloud warrants or provider productions related to the account that held the video.`,
        `Identity of every person who viewed or exported the clip before production to the defense.`,
        `Whether related videos on the same device were withheld and the Brady analysis for each.`,
        `Chain of custody from seizure → extraction → trial exhibit, including hash at each handoff.`,
        `Department policy on officers using personal phones for evidence capture.`,
        `Any alteration, jailbreak, or investigative malware placed on the device.`,
        `Retention of the physical device and defense inspection rights.`,
        `Third-party (witness) phone: how authenticity will be proven without the witness's cloud password sole control.`,
      ],
    };
    return blocks[kind];
  }

  // fixed_surveillance (default) — existing ALPR-oriented set
  const blocks = {
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
      `Any warrant, court order, or supervisory authorization obtained before running the ALPR / ${vendorName} queries that led to this stop — and if no warrant was obtained, documentation of the legal basis on which the agency concluded no warrant was required (including any reliance on the third-party doctrine, "hotlist" exceptions, or vendor terms).`,
      `Department policy on documentation requirements for ALPR / surveillance queries.`,
      `The department's ALPR / ${vendorName} usage policy (SOP, general order, or training bulletin) in effect on the date of the incident — including any guidance about disclosing ALPR use to vehicle occupants, mentioning ALPR in reports or complaints, referring to the system as "county resources" or similar euphemisms, or treating ALPR hits as "intelligence."`,
      `Audit logs for the specific query that produced evidence against the defendant, with full metadata — including any multi-camera / multi-jurisdiction travel-pattern reconstruction used to build probable cause.`,
      `Prior complaints, IA investigations, or discipline involving the officer's ALPR use.`,
      `Agency-wide statistics on queries without case numbers for the prior 12 months.`,
      `Training materials provided to officers on lawful use of ${vendorName}, including any federal (FBI/DOJ) or state guidance on how vaguely to describe Flock / ALPR searches in reports, plus any alerts or anomaly detection for personal / stalking-pattern queries.`,
      `Retention and deletion policies for query logs, and a list of all agencies and federal partners with access to the local ${vendorName} network.`,
    ],
  };
  return blocks[kind];
}
