/**
 * Offline document template unit tests (no Worker / network).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOfflineDocs } from "../offline-docs.js";
import { CELLPHONE_PROFILE, resolveFootageProfile } from "../footage-modes.js";

describe("offline document templates", () => {
  const ctx = {
    caseNumber: "24-CR-8841",
    defendant: "Jordan Avery Lee",
    court: "Superior Court of California, County of Alameda",
    jurisdiction: "State of California",
    city: "Oakland",
    cameraType: "Flock Safety ALPR fixed camera",
    footageCategory: "fixed_surveillance",
    searchFacts:
      "Officer queried plate 7XKR492 on 2024-11-03 without a case number in the audit log export.",
    civilHarm:
      "Client detained at gunpoint for 40 minutes after a misread plate; released with no citation.",
  };

  const profile = {
    name: "Flock Safety",
    authFacts: ["No public Merkle anchoring documentation."],
    errorRateFacts: ["Approximately 10% plate misread estimate cited in industry reporting."],
    accessAbuseFacts: ["Documented personal-use queries in multiple jurisdictions."],
    civilFacts: ["Section 1983 claims for wrongful ALPR stops."],
    sources: ["Institute for Justice"],
  };

  it("embeds case caption fields in all four docs", () => {
    const docs = buildOfflineDocs({
      vendorName: "Flock Safety",
      profile,
      ctx,
      enriched: "ADDITIONAL FACTS:\nWitness session ws-demo-1",
    });
    for (const key of ["motion", "accuracy", "access", "civil"]) {
      assert.equal(typeof docs[key], "string");
      assert.match(docs[key], /24-CR-8841/);
      assert.match(docs[key], /Jordan Avery Lee/i);
      assert.match(docs[key], /Flock Safety/);
      assert.ok(docs[key].length > 800, `${key} too short`);
    }
    assert.match(docs.motion, /FRE 901/);
    assert.match(docs.accuracy, /FRE 702|Daubert/);
    assert.match(docs.access, /Fourth Amendment/);
    assert.match(docs.civil, /1983/);
    assert.match(docs.access, /7XKR492/);
    assert.match(docs.civil, /detained at gunpoint/);
    assert.match(docs.motion, /Witness session ws-demo-1/);
  });

  it("includes ten discovery requests per motion type", () => {
    const docs = buildOfflineDocs({
      vendorName: "Flock Safety",
      profile,
      ctx,
      enriched: "",
    });
    for (const key of ["motion", "accuracy", "access"]) {
      assert.match(docs[key], /10\. /);
    }
  });

  it("body-worn mode pressures mute/dock hash and clawql-surveillance-class controls", () => {
    const axon = {
      name: "Axon (formerly TASER)",
      authFacts: ["No public hardware hash before dock."],
      errorRateFacts: ["Completeness failures on activation."],
      accessAbuseFacts: ["Vault logs are vendor-controlled."],
      civilFacts: ["§ 1983 for incomplete force video."],
      sources: ["Axon docs"],
    };
    const resolved = resolveFootageProfile("body_worn", "axon", axon, null);
    const docs = buildOfflineDocs({
      vendorName: resolved.vendorName,
      profile: resolved.profile,
      ctx: {
        ...ctx,
        footageCategory: "body_worn",
        cameraType: "Axon Body 3",
        searchFacts: "Officer muted for 45 seconds during takedown.",
      },
      enriched: "",
    });
    assert.match(docs.motion, /BODY-WORN|body-worn/i);
    assert.match(docs.motion, /leave-device|dock|mute/i);
    assert.match(docs.motion, /clawql-surveillance/i);
    assert.match(docs.accuracy, /completeness|mute|activation/i);
    assert.match(docs.access, /Evidence-vault|vault|Brady/i);
    assert.match(docs.motion, /10\. /);
  });

  it("cellphone mode demands cryptographic proof against AI alteration", () => {
    const docs = buildOfflineDocs({
      vendorName: CELLPHONE_PROFILE.name,
      profile: CELLPHONE_PROFILE,
      ctx: {
        ...ctx,
        footageCategory: "cellphone",
        cameraType: "iPhone 15 via WhatsApp export",
        searchFacts: "Phone seized; only a compressed chat export produced.",
        civilHarm: "Charged based on a clip that may be AI-edited.",
      },
      enriched: "",
    });
    assert.match(docs.motion, /CELL PHONE|AI-ALTERATION/i);
    assert.match(docs.motion, /cryptographic|Challenge-grade|content credential/i);
    assert.match(docs.accuracy, /deepfake|AI|over-trust/i);
    assert.match(docs.access, /Riley/);
    assert.match(docs.civil, /unverified|altered/i);
    assert.match(docs.motion, /10\. /);
  });
});
