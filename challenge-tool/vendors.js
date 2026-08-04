/**
 * Known surveillance vendors with documented facts for system prompt injection.
 * Each entry provides pre-populated context the AI uses to generate sharper documents.
 * Sources are cited so the Worker can pass them through to generated documents.
 *
 * Add new vendors here as documentation becomes available.
 * Fields marked optional can be omitted if unknown.
 */

export const VENDORS = {
  flock: {
    id: "flock",
    name: "Flock Safety",
    cameraTypes: ["License Plate Reader (ALPR)", "Falcon Camera", "Arrow Camera"],
    knownFacts: [
      "FOIA-derived audit logs published at haveibeenflocked.com show 233 million searches against Flock's network, with 84% carrying no case number and approximately 9% tied to documented crimes.",
      "FBI and Homeland Security have accessed local Flock networks without clear awareness or approval from the contracting localities, as documented in public reporting based on FOIA records.",
      "Dozens of cities have canceled or declined to renew Flock contracts over unauthorized federal data sharing, including cities in multiple states.",
      "Flock Safety's audit logs obtained via FOIA do not contain cryptographic hash values for footage segments and do not show evidence of Merkle chaining or external immutable anchoring.",
      "Andreessen Horowitz (a16z) has funded both Flock Safety and Toka, an Israeli cyber firm co-founded by former Prime Minister Ehud Barak and former IDF cyber chief Yaron Rosen. Haaretz reported in 2022 based on internal documents that Toka sells technology capable of altering both live and archived camera feeds without leaving forensic traces.",
    ],
    auditLogGaps: [
      "No cryptographic hash of footage at point of capture",
      "No Merkle-chained audit log",
      "No external immutable anchor (Arweave or equivalent)",
      "84% of queries carried no case number in FOIA-derived logs",
      "Federal agency access logged inconsistently or without local awareness",
    ],
    sources: [
      "haveibeenflocked.com — FOIA-derived audit logs",
      "Haaretz, 2022 — Toka internal documents",
      "Andreessen Horowitz portfolio disclosures",
    ],
  },

  axon: {
    id: "axon",
    name: "Axon (formerly TASER)",
    cameraTypes: ["Axon Body 3", "Axon Fleet 3", "Axon Air", "Axon Camera"],
    knownFacts: [
      "Axon Evidence is a cloud-based digital evidence management platform used by law enforcement agencies to store and share footage from Axon body cameras and fleet cameras.",
      "Axon Evidence stores footage on third-party cloud infrastructure (Microsoft Azure). Chain of custody depends on Axon's internal access controls rather than independently verifiable cryptographic proof.",
      "Multiple public records requests and civil litigation have raised questions about Axon's audit log completeness, including whether all access events are logged and whether logs are tamper-evident.",
      "Axon has faced scrutiny from civil liberties organizations regarding data retention practices, third-party data sharing, and the absence of independent audit mechanisms.",
      "Axon's Evidence.com platform does not publicly document cryptographic hashing of footage at capture within camera hardware, Merkle-chained audit logs, or external immutable anchoring of evidence integrity.",
    ],
    auditLogGaps: [
      "No publicly documented hardware-level hash at capture",
      "No publicly documented Merkle-chained audit log",
      "No external immutable anchor independent of Axon infrastructure",
      "Cloud storage on third-party infrastructure introduces additional chain of custody questions",
      "Access log completeness not independently verifiable",
    ],
    sources: [
      "Axon Evidence platform documentation (public)",
      "Electronic Frontier Foundation — Axon surveillance reporting",
      "ACLU — body camera data retention and access reporting",
    ],
  },

  motorola: {
    id: "motorola",
    name: "Motorola Solutions (Vigilant Solutions / PMAM)",
    cameraTypes: [
      "ALPR Camera",
      "Vigilant Fixed LPR",
      "Avigilon Camera",
      "CommandCentral Evidence",
    ],
    knownFacts: [
      "Motorola Solutions acquired Vigilant Solutions in 2019, adding one of the largest private ALPR networks in the United States to its law enforcement technology portfolio.",
      "Vigilant's LEARN (Law Enforcement Archival and Reporting Network) database aggregates license plate data from law enforcement and commercial sources, with documented sharing across jurisdictions and with federal agencies.",
      "Motorola Solutions' CommandCentral Evidence platform stores digital evidence including camera footage. Like competing platforms, it does not publicly document cryptographic hashing at capture, Merkle-chained audit logs, or external immutable anchoring.",
      "Civil liberties researchers have documented that Vigilant/Motorola ALPR data is shared broadly across law enforcement networks with limited access logging visible to contracting agencies.",
      "Motorola Solutions acquired Avigilon in 2018, adding AI-powered video surveillance and analytics capabilities. Avigilon cameras and video management systems are widely deployed in public spaces.",
    ],
    auditLogGaps: [
      "No publicly documented hardware-level hash at capture",
      "No publicly documented Merkle-chained audit log",
      "No external immutable anchor independent of Motorola infrastructure",
      "LEARN database sharing practices limit contracting agency visibility into data access",
      "Cross-jurisdictional data sharing not consistently logged at the local level",
    ],
    sources: [
      "Electronic Frontier Foundation — Vigilant Solutions reporting",
      "ACLU — ALPR data sharing documentation",
      "Motorola Solutions CommandCentral Evidence documentation (public)",
    ],
  },

  genetec: {
    id: "genetec",
    name: "Genetec",
    cameraTypes: ["Genetec Camera", "AutoVu ALPR", "Security Center Omnicast"],
    knownFacts: [
      "Genetec is a Canadian video surveillance, access control, and ALPR platform widely deployed by municipalities, transit agencies, and law enforcement in the United States.",
      "Genetec's AutoVu ALPR system captures and stores license plate data. Genetec's Security Center platform manages video evidence storage and access.",
      "Genetec does not publicly document cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring of footage integrity.",
      "Genetec's platform includes audit logging features, but these are internal to the Genetec infrastructure and not independently verifiable by outside parties without Genetec cooperation.",
    ],
    auditLogGaps: [
      "No publicly documented hardware-level hash at capture",
      "No publicly documented Merkle-chained audit log",
      "No external immutable anchor independent of Genetec infrastructure",
      "Audit logs stored within vendor-controlled infrastructure",
      "Independent verification requires Genetec cooperation",
    ],
    sources: [
      "Genetec Security Center documentation (public)",
      "Genetec AutoVu ALPR documentation (public)",
    ],
  },

  verkada: {
    id: "verkada",
    name: "Verkada",
    cameraTypes: ["Verkada Camera", "Verkada Dome Camera", "Verkada Mini Camera"],
    knownFacts: [
      "Verkada is a cloud-managed physical security platform. All Verkada camera footage is stored in Verkada's cloud infrastructure and accessed through Verkada's Command platform.",
      "In March 2021, Verkada suffered a significant security breach in which hackers gained access to live feeds from approximately 150,000 cameras deployed at hospitals, schools, jails, and corporations. The breach exposed fundamental questions about the security of cloud-managed surveillance infrastructure.",
      "Verkada does not publicly document cryptographic hashing of footage within camera hardware, Merkle-chained audit logs, or external immutable anchoring of footage integrity.",
      "All Verkada footage access depends on Verkada's cloud infrastructure. There is no independently verifiable record of access events outside Verkada's own systems.",
      "The 2021 breach demonstrated that Verkada's internal access controls — a super admin account with unrestricted access — could be compromised without detection until the breach was publicly disclosed.",
    ],
    auditLogGaps: [
      "No publicly documented hardware-level hash at capture",
      "No publicly documented Merkle-chained audit log",
      "No external immutable anchor independent of Verkada cloud infrastructure",
      "2021 breach demonstrated centralized access control vulnerability",
      "No independently verifiable access log outside Verkada systems",
    ],
    sources: [
      "Bloomberg, March 2021 — Verkada breach reporting",
      "Verkada Command platform documentation (public)",
      "VICE/Motherboard — Verkada breach reporting",
    ],
  },

  custom: {
    id: "custom",
    name: "",
    cameraTypes: [],
    knownFacts: [],
    auditLogGaps: [],
    sources: [],
  },
};

export const VENDOR_LIST = [
  { value: "flock", label: "Flock Safety" },
  { value: "axon", label: "Axon (formerly TASER)" },
  { value: "motorola", label: "Motorola Solutions / Vigilant" },
  { value: "genetec", label: "Genetec" },
  { value: "verkada", label: "Verkada" },
  { value: "custom", label: "Other / Enter manually" },
];
