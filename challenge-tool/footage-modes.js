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

export function getFootageCategory(id) {
  return FOOTAGE_CATEGORIES.find((c) => c.id === id) || FOOTAGE_CATEGORIES[0];
}

/** Built-in profile when challenging cellphone footage (not a camera vendor). */
export const CELLPHONE_PROFILE = {
  name: "cellphone footage",
  authFacts: [
    "Consumer smartphones do not, by default, produce independently verifiable cryptographic commitments of video at the moment of capture that a third party can check without trusting the device owner or cloud vendor.",
    "Generative AI and consumer editing tools can alter, fabricate, or selectively re-time audiovisual content; without a capture-time hash (or equivalent content credential) anchored outside the proponent's control, 'this is what the phone recorded' is an assertion, not a proof.",
    "Common distribution paths — Messages, WhatsApp, iCloud/Google Photos re-export, social apps — re-encode video, strip or rewrite metadata, and break any informal chain of custody.",
    "EXIF / file-system timestamps and 'original filename' claims are trivially spoofable and are not a substitute for a cryptographic integrity regime.",
    "Challenge-grade capture (hash at capture, on-device transcript commitment, optional external anchor) exists for civilian phones; footage that lacks those controls should not receive a reliability presumption in court.",
  ],
  errorRateFacts: [
    "Synthetic media and AI face/voice swap tools are commercially available and improving; courts increasingly confront deepfake risk in both civil and criminal cases.",
    "Compressed phone video and partial clips can omit critical seconds before/after an encounter, creating a misleading narrative without any 'AI' edit.",
    "Human viewers systematically over-trust video relative to other evidence ('seeing is believing'), amplifying the prejudice of unverified clips under FRE 403 / 702 analysis.",
    "There is no accepted judicial error-rate floor for AI-altered or AI-assisted phone video offered to prove guilt; unauthenticated clips fail the reliability showing expected of technical evidence.",
  ],
  accessAbuseFacts: [
    "Riley v. California recognizes the uniquely invasive nature of cellphone searches; warrantless or overbroad extractions raise independent Fourth Amendment issues when law enforcement offers phone video.",
    "Selective production of a single clip from a device that held hours of related media is an access/custody problem — the proponent controls which seconds the fact-finder sees.",
    "Cloud backups and shared albums may expose footage to third parties (carriers, platform vendors, synced household accounts) without a complete access log produced in discovery.",
    "When an officer records on a personal phone outside the department body-cam policy, retention, audit, and Brady obligations are frequently undefined.",
  ],
  civilFacts: [
    "Publishing or relying on unverified or altered phone video to justify force, detention, or prosecution can support Fourth Amendment and reputational tort theories under 42 U.S.C. § 1983 and state law.",
    "Agencies that accept civilian phone clips as investigative gospel without integrity controls externalize deepfake and edit risk onto defendants.",
  ],
  sources: [
    "Riley v. California, 573 U.S. 373 (2014)",
    "Public reporting on generative AI / deepfake evidence risk in courts",
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
      "Body-worn camera vendors should integrate Challenge-grade controls (hash before leave-device, mute/dock/export audit, third-party verifiable export — e.g. clawql-surveillance class integrity) or face the same FRE 901 pressure as fixed surveillance.",
    authExtra: [
      "Body-worn systems commonly buffer, mute, and dock-upload through vendor clouds; without a cryptographic commitment before media leaves the camera, docking and cloud re-encode are integrity breakpoints.",
      "Selective activation, covered lenses, and unlogged mute intervals mean the absence of video is itself an evidentiary event that vendor portals rarely prove with tamper-evident logs.",
      "Evidence management platforms (e.g. Axon Evidence / Evidence.com class systems) are typically the sole oracle for access and export history — not an independent verifier.",
    ],
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
        sources: [...(vendorProfile.sources || [])],
      }
    : null;

  if (base && pack.authExtra?.length) {
    // Prepend mode-specific integrity pressure without dropping vendor facts.
    base.authFacts = [...pack.authExtra, ...base.authFacts];
  }

  if (mode.id === "body_worn" && base) {
    base.errorRateFacts = [
      "Body-worn camera 'accuracy' for criminal proof is primarily a completeness and fidelity problem: missing activation, mute gaps, and dock/cloud re-encode can omit the decisive seconds of an encounter.",
      "Vendor AI tools (auto-transcribe, redaction, search) introduce secondary model-error risk when the state relies on AI-derived descriptions of what the video shows.",
      "Presenting a partial body-cam clip as the complete record is a reliability defect under FRE 702 even when the pixels shown are unaltered.",
      ...(base.errorRateFacts || []).filter((f) => !/ALPR|plate misread/i.test(f)),
    ];
    base.accessAbuseFacts = [
      "Who could view, share, or export the body-worn file from the evidence vault — and whether those events are tamper-evident — is the body-cam analogue of ALPR query abuse.",
      "Retention and automatic deletion policies can destroy Brady material; discovery must lock preservation immediately.",
      ...(base.accessAbuseFacts || []).filter((f) => !/ALPR|license plate|Flock search/i.test(f)),
    ];
    base.civilFacts = [
      "Incomplete or selectively retained body-worn footage that conceals force or exculpatory context supports § 1983 theories and spoliation arguments.",
      ...(base.civilFacts || []),
    ];
  }

  return {
    mode,
    pack,
    vendorName: base?.name || customName || "the footage source",
    profile: base,
  };
}

/** Mode-specific discovery requests (10 each) for offline + prompt guidance. */
export function discoveryRequests(vendorName, kind, footageCategory) {
  const mode = footageCategory || "fixed_surveillance";

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
  return blocks[kind];
}
