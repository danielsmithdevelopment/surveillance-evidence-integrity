/**
 * Curated press & research links used on /media.html.
 * Keep summaries factual; "whyItMatters" ties each item to CTF challenge vectors.
 */

export const MEDIA_SECTIONS = [
  {
    id: "first-amendment",
    title: "First Amendment retaliation — Lenexa MYOC",
    intro:
      "The most legally significant ALPR abuse pattern in this collection: written directives to find a pretext to stop a critic of the department. Vendor-agnostic — Lenexa used Axon, Genetec, and Leonardo, not Flock.",
    stories: [
      {
        outlet: "KCUR",
        date: "February 2, 2026",
        title:
          "Lenexa police investigated author of column criticizing the department. He's 'pissed off'",
        url: "https://www.kcur.org/politics-elections-and-government/2026-02-02/lenexa-police-investigated-column-writer-critical-failure-warn-ice-raid-councilwoman-investigation",
        summary:
          "After Canyen Ashworth published a Kansas City Star guest column criticizing Lenexa PD, the department used city ALPRs to track his car, issued a department-wide BOLO, and directed officers to “MYOC” — make your own case — find a reason to stop him. He was never charged and was not the poster-hanger in the surveillance video. ACLU of Kansas and First Amendment experts called the tactics retaliatory.",
        whyItMatters:
          "Written MYOC language is rare direct evidence of retaliatory motive. Feeds § 1983 First Amendment retaliation (Vector 5) and aggravates Fourth Amendment suppression / civil demand discovery (BOLOs, post-criticism plate queries, pretext-stop directives).",
      },
      {
        outlet: "KCUR",
        date: "June 29, 2026",
        title:
          "Missouri and Kansas police use cameras to track license plates, but residents resist surveillance",
        url: "https://www.kcur.org/news/2026-06-29/automated-license-plate-readers-alpr-kansas-city-lenexa-weston-police",
        summary:
          "Follow-up confirming Ashworth’s plate was captured ~150 times in less than two years, and that Lenexa’s ALPR stack is Axon, Genetec, and Leonardo — not Flock. Ashworth said the experience “radicalized” him against ALPRs.",
        whyItMatters:
          "Locks the vendor-agnostic architecture: First Amendment retaliation is an ALPR problem, not a Flock-only problem. Strengthens Axon and Genetec profiles in the generator.",
      },
      {
        outlet: "The Pitch KC",
        date: "August 2026",
        title:
          "EyesOffKC organizes against Flock surveillance for upcoming National Week of Action",
        url: "https://www.thepitchkc.com/eyesoffkc-organizes-against-flock-surveillance-for-upcoming-national-week-of-action/",
        summary:
          "Local organizers cite the Lenexa tracking of Ashworth after his critical column as proof that ALPR databases enable speech retaliation, while pushing Kansas City to cancel contracts ahead of a National Week of Action.",
        whyItMatters:
          "Shows how the Lenexa fact pattern is already framing regional political and legal organizing — useful context for demand letters and public-defender briefing.",
      },
    ],
  },
  {
    id: "tower-dump",
    title: "Court rulings — bulk location dragnets",
    intro:
      "The Carpenter → Smith → Reeves line on geofence and tower-dump warrants. Structural fuel for arguing warrantless ALPR travel-pattern queries are general searches.",
    stories: [
      {
        outlet: "S.D. Miss. (Reeves, C.J.)",
        date: "August 5, 2026",
        title: "In re Four Applications… a/k/a Tower-Dump Warrants — order affirming denial",
        url: "https://www.courtlistener.com/docket/69660910/41/united-states-v-sealed/",
        summary:
          "Chief Judge Carlton W. Reeves affirmed a magistrate’s denial of four FBI tower-dump warrant applications in a Jackson, Mississippi gang-violence investigation. Tower dumps — records of every cellphone that connected to specified towers near crime scenes so police can later identify unknown suspects — are per se unconstitutional under the Fourth Amendment as general warrants. Builds on United States v. Smith (5th Cir. 2024) holding geofence warrants categorically unconstitutional.",
        whyItMatters:
          "Collect-everyone-sift-later is the same architecture as ALPR networks. Pair with Abrams-Phillips-style multi-camera travel profiling: argue warrantless Flock queries need particularized probable cause under Carpenter / Smith / Reeves.",
      },
      {
        outlet: "Fifth Circuit",
        date: "2024",
        title: "United States v. Smith — geofence warrants per se unconstitutional",
        url: "https://www.govinfo.gov/content/pkg/USCOURTS-ca5-23-60321/pdf/USCOURTS-ca5-23-60321-0.pdf",
        summary:
          "Fifth Circuit held geofence warrants (compel Google location data for everyone in a geographic box) are categorically unconstitutional general warrants — the controlling circuit precedent Reeves applied to tower dumps.",
        whyItMatters:
          "Doctrinal bridge from Carpenter CSLI privacy to bulk digital location tools. Cite with Reeves when arguing ALPR retroactive sifting.",
      },
    ],
  },
  {
    id: "404-aug-2026",
    title: "404 Media — August 2026 Flock series",
    intro:
      "Three stories in roughly 48 hours. Direct inputs to the Flock vendor profile and Fourth Amendment document templates.",
    stories: [
      {
        outlet: "404 Media",
        date: "August 5–6, 2026",
        title:
          "Cops Used Flock to Track a Man Across State Lines to Create Pretext to Search His Car for Weed",
        url: "https://www.404media.co/cops-used-flock-to-track-a-man-across-state-lines-to-create-pretext-to-search-his-car-for-weed/",
        summary:
          "Wisconsin police used Flock hits along Interstate 41 to reconstruct Edward Abrams-Phillips’s travel into Michigan (where marijuana is legal) and back, then cited that pattern — a “known source state for marijuana” — as part of probable cause to search his car. Bail jumping was dismissed; he was convicted only of weed possession.",
        whyItMatters:
          "Establishes the travel-pattern / pretext-stop vector — and the cleanest fact pattern for the tower-dump / general-warrant analogy (Reeves / Smith). Feeds the Fourth Amendment motion and discovery for multi-camera reconstruction logs and warrant authorization.",
      },
      {
        outlet: "404 Media",
        date: "August 4, 2026",
        title: "‘DO NOT MENTION ALPR USAGE’: How Cops Are Trying to Hide Their Use of Flock",
        url: "https://www.404media.co/do-not-mention-alpr-usage-how-cops-are-trying-to-hide-the-existence-of-flock/",
        summary:
          "Wapello County, Iowa’s November 2025 Flock SOP tells officers not to mention ALPR usage to vehicle occupants or in reports/complaints unless “absolutely necessary,” and to call the system “county resources,” treating hits like intelligence. The piece also recounts FBI/DOJ guidance to be “as vague as permissible” about Flock use because searches are public-records-discoverable.",
        whyItMatters:
          "Written concealment policy is bad-faith / Franks material. Discovery should demand the ALPR disclosure SOP in effect on the stop date.",
      },
      {
        outlet: "404 Media",
        date: "August 2026",
        title: "Police Used Flock to Give a Man a Traffic Ticket",
        url: "https://www.404media.co/police-used-flock-to-give-a-man-a-traffic-ticket/",
        summary:
          "Georgia State Patrol cited a motorcyclist for holding a phone based on a Flock capture (“CAPTURED ON FLOCK CAMERA…”), even though many cities tell residents Flock is not for traffic enforcement. The ticket was later dropped.",
        whyItMatters:
          "Documents mission creep: cameras pitched for serious crime used for minor traffic pretext, undermining public purpose limits.",
      },
    ],
  },
  {
    id: "404-flock",
    title: "404 Media — broader Flock reporting",
    intro: "Prior investigations that map how the network is actually used and where it fails.",
    stories: [
      {
        outlet: "404 Media",
        date: "2025–2026",
        title: "How Cops Use Flock to Track People, Not Cars",
        url: "https://www.404media.co/how-cops-use-flock-to-track-people-not-cars/",
        summary:
          "Police have used Flock FreeForm AI searches hundreds of times for descriptions of people (clothing, tattoos, race, political signals) — not just plates — across many cameras at once.",
        whyItMatters:
          "Shows the product is a people-tracking network. Supports overbreadth and reliability challenges when AI “matches” drive stops.",
      },
      {
        outlet: "404 Media",
        date: "2025",
        title: "ICE Taps into Nationwide AI-Enabled Camera Network, Data Shows",
        url: "https://www.404media.co/ice-taps-into-nationwide-ai-enabled-camera-network-data-shows/",
        summary:
          "Local and state agencies ran thousands of Flock lookups for ICE / immigration purposes even without a direct Flock–ICE contract — side-door access through local partners.",
        whyItMatters:
          "Cross-agency sharing without clear local consent is core access-abuse and civil-rights exposure; demand partner-access lists in discovery.",
      },
      {
        outlet: "404 Media",
        date: "2026",
        title: "Wildlife Conservation Police Are Searching Thousands of Flock Cameras for ICE",
        url: "https://www.404media.co/floridas-wildlife-cops-are-searching-thousands-of-flock-cameras-for-ice/",
        summary:
          "Florida Fish and Wildlife officers queried nationwide Flock cameras for ICE after reforms that supposedly limited federal sharing — while search reasons grow vaguer.",
        whyItMatters:
          "Shows opt-outs and vendor PR (“we don’t work with ICE”) can be bypassed via unexpected agencies; pairs with the “as vague as permissible” guidance.",
      },
      {
        outlet: "404 Media",
        date: "2025",
        title: "Flock Exposed Its AI-Powered Cameras to the Internet. We Tracked Ourselves",
        url: "https://www.404media.co/flock-exposed-its-ai-powered-cameras-to-the-internet-we-tracked-ourselves/",
        summary:
          "Dozens of Flock Condor PTZ cameras — built to track people, not plates — were left livestreaming and administratively exposed on the open internet, including archives and settings.",
        whyItMatters:
          "Integrity and chain-of-custody collapse if anyone can watch or alter settings; strengthens FRE 901 challenges when the vendor is the sole oracle.",
      },
      {
        outlet: "404 Media",
        date: "2025",
        title: "Flock Leaked Cops’ License Plate Searches via DuckDuckGo, Bing",
        url: "https://www.404media.co/flock-leaked-cops-license-plate-searches-via-duckduckgo-bing/",
        summary:
          "Flock exposed some plate searches and stated reasons in public search-engine results — an unexpected leak of investigative intent.",
        whyItMatters:
          "Vendor-controlled audit infrastructure is not trustworthy by default; supports demands for independent, tamper-evident logs.",
      },
    ],
  },
  {
    id: "research",
    title: "Research, FOIA, and civil litigation",
    intro: "Primary sources behind the fixed/ALPR fact packs in the generator.",
    stories: [
      {
        outlet: "Have I Been Flocked?",
        date: "Ongoing",
        title: "FOIA-derived Flock network audit logs",
        url: "https://haveibeenflocked.com",
        summary:
          "Public records releases of Flock search audits — the dataset behind the claim that a huge share of queries carry no case number.",
        whyItMatters:
          "Without mandatory case numbers, personal misuse is structurally invisible. Anchors the access-abuse and discovery templates.",
      },
      {
        outlet: "Institute for Justice",
        date: "2024–2026",
        title: "Norfolk, VA camera surveillance (Plate Privacy Project)",
        url: "https://ij.org/case/norfolk-virginia-camera-surveillance/",
        summary:
          "Federal suit challenging Norfolk’s warrantless Flock dragnet under the Fourth Amendment — first IJ Plate Privacy case; survived dismissal, later summary judgment for the city (on appeal).",
        whyItMatters:
          "Civil companion to criminal suppression: Carpenter-style location privacy against ALPR networks; § 1983 demand-letter backbone.",
      },
      {
        outlet: "Institute for Justice",
        date: "Ongoing",
        title: "ALPR error and romantic-partner surveillance documentation",
        url: "https://ij.org/",
        summary:
          "IJ has documented dozens of wrongful stops from plate misreads and officers using ALPR networks to stalk partners and others — the ~27 / ~28 case counts cited in CTF motions.",
        whyItMatters:
          "Empirics for FRE 702 reliability and Fourth Amendment access-abuse patterns.",
      },
      {
        outlet: "EFF",
        date: "Ongoing",
        title: "ALPR accuracy and misuse reporting",
        url: "https://www.eff.org/issues/automated-license-plate-readers-alpr",
        summary:
          "Civil-liberties analysis of ALPR networks, including large-scale Flock search audits tied to protests, reproductive care, and discriminatory targeting.",
        whyItMatters: "Independent corroboration that query abuse is systemic, not anecdotal.",
      },
      {
        outlet: "Wednesday Journal (Oak Park)",
        date: "August 2025",
        title: "Oak Park terminates Flock license plate reader contract",
        url: "https://www.oakpark.com/2025/08/07/oak-park-terminates-flock-license-plate-reader-contract/",
        summary:
          "Village board ended its Flock contract after an oversight finding that the cameras played no meaningful role in local crime investigations — later followed by state findings of legal violations.",
        whyItMatters:
          "Procurement and reliability fact: years of deployment with no demonstrated investigative value; useful for FRE 702 and council outreach.",
      },
      {
        outlet: "Haaretz",
        date: "December 2022",
        title: "This ‘Dystopian’ Cyber Firm Could Have Saved Mossad Assassins From Exposure (Toka)",
        url: "https://www.haaretz.com/israel-news/security-aviation/2022-12-26/ty-article-magazine/.premium/this-dystopian-cyber-firm-could-have-saved-mossad-assassins-from-exposure/00000185-0bc6-d26d-a1b7-dbd739100000",
        summary:
          "Internal documents: Toka sells tech that can alter live and archived camera feeds without forensic traces. Andreessen Horowitz has funded both Toka and Flock.",
        whyItMatters:
          "Baseline FRE 901 risk: without hash-at-capture and independent anchors, “unaltered footage” is a vendor assertion.",
      },
      {
        outlet: "DHS SAVER",
        date: "June 2025",
        title: "ALPR Market Survey Report",
        url: "https://www.dhs.gov/science-and-technology/saver",
        summary:
          "Federal market survey acknowledging character-confusion errors (0/O, 1/I) in ALPR OCR without setting a minimum acceptable accuracy standard for criminal use.",
        whyItMatters:
          "Government acknowledgment of error classes used in the FRE 702 / Daubert templates.",
      },
    ],
  },
  {
    id: "body-worn",
    title: "Body-worn camera integrity",
    intro: "Reporting that parallels fixed-cam vectors for Axon-class systems.",
    stories: [
      {
        outlet: "CBS 2 Chicago",
        date: "2020–2021",
        title: "Left in the Dark: The Failed Promise of Chicago Police Body Cameras",
        url: "https://www.cbsnews.com/chicago/news/left-in-the-dark-the-failed-promise-of-chicago-police-body-cameras/",
        summary:
          "Investigative series documenting tens of thousands of CPD encounters never recorded on mandatory body-worn cameras, with weak discipline and broken supervisor-review loops.",
        whyItMatters:
          "Supports the failure-to-record ratchet (Stage 1) before authenticity theater when BWC footage is missing or partial.",
      },
      {
        outlet: "MTN News (Billings)",
        date: "2023–2025",
        title: "Hidden consent: Billings police body cam video exposes deceptive tactic",
        url: "https://www.ktvq.com/news/crime-watch/hidden-consent-billings-police-body-cam-video-exposes-deceptive-tactic",
        summary:
          "Officers removed or turned off body cams during a May 2023 stop while discussing consent-to-search; nearly 180 cases later reviewed, dozens dismissed; discipline followed.",
        whyItMatters:
          "Device audit trails and mute/off logs are the body-worn analogue of ALPR query abuse — camera-off is both criminal discovery and civil exposure.",
      },
    ],
  },
];
