/**
 * Homepage marketing sections — problem, how-it-works, credibility, FAQ.
 * Kept separate from the generate form so App.jsx stays focused on the tool flow.
 */

import { btnGhost, btnPrimary, btnSecondary } from "./Shell.jsx";

const HOW_STEPS = [
  {
    n: "01",
    title: "Capture",
    body: "Record what happened on your phone — or use footage already in the case.",
  },
  {
    n: "02",
    title: "Seal a trust chain",
    body: "Hashes and a Merkle root bind the recording so later swaps are detectable.",
  },
  {
    n: "03",
    title: "Verify independently",
    body: "Anyone with the session ID can re-check fingerprints — no vendor portal required.",
  },
  {
    n: "04",
    title: "Generate templates",
    body: "Attorney-ready drafts for FRE 901, FRE 702, Fourth Amendment, and § 1983.",
  },
];

const FAQ = [
  {
    q: "Is this legal advice?",
    a: "No. Challenge the Footage generates document templates for attorney review. It does not create an attorney-client relationship. Verify facts and adapt them to your jurisdiction before filing.",
  },
  {
    q: "Do I need a crypto wallet?",
    a: "No. You do not need a wallet, tokens, or any cryptocurrency. Integrity packaging and optional external anchoring happen under the hood. Sign in, capture or generate, and share the verification ID with counsel.",
  },
  {
    q: "Is a generated motion admissible in court?",
    a: "Admissibility is decided by the court. These documents are starting templates — not filings. An attorney should review, cite local rules, and file under their own signature.",
  },
  {
    q: "What if the other side has the “original” footage?",
    a: "That is the point of the challenge. If the vendor cannot show hardware hashing, tamper-evident logs, or independent verification, FRE 901(b)(9) authenticity is contested — whether or not they produce a file they call original.",
  },
  {
    q: "I’m a public defender. Is this free?",
    a: "Yes. Email pd@challengethefootage.com from your office address for unlimited free access after whitelist. Details on the Public Defenders page.",
  },
];

export function LandingHero({ onGenerateClick, signInSlot }) {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
      <p className="animate-rise font-display text-[clamp(2.4rem,7vw,4.25rem)] leading-[0.95] tracking-tight text-ink">
        Challenge the Footage
      </p>
      <h1 className="animate-rise mt-5 max-w-2xl text-[clamp(1.35rem,3.2vw,1.85rem)] font-medium leading-snug text-ink">
        Surveillance cameras are being used against people in court — and the footage can&apos;t
        always be trusted. Here&apos;s how to fight back.
      </h1>
      <p className="animate-rise-delay mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
        Record a verifiable evidence chain when it matters, then generate challenge documents
        attorneys can review and file.
      </p>

      <div className="animate-rise-delay mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a href="/evidence" className={btnPrimary}>
          Record Evidence Now
        </a>
        <button type="button" className={btnSecondary} onClick={onGenerateClick}>
          Generate Challenge Documents
        </button>
        <a href="/public-defenders" className={btnGhost}>
          I&apos;m a Public Defender — Get Free Access
        </a>
      </div>

      {signInSlot ? <div className="mt-6">{signInSlot}</div> : null}
    </div>
  );
}

export function LandingSections() {
  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Why this matters */}
      <section aria-labelledby="why-heading" className="animate-fade">
        <h2 id="why-heading" className="font-display text-3xl text-ink sm:text-4xl">
          Why this matters
        </h2>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Official audits and vendor admissions show the problem is not theoretical.
        </p>

        <div className="mt-8 grid gap-8 border-y border-line/80 py-8 sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="font-display text-5xl leading-none text-teal-deep">32.3%</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
              False-positive rate
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              LAPD Inspector General audit of Flock hot-list alerts (Aug–Sep 2025): 161 of 498
              alerts that triggered stops were false positives — innocent drivers stopped under
              high-risk protocol.{" "}
              <a
                className="font-medium text-teal-deep underline underline-offset-2"
                href="https://www.oig.lacity.org/_files/ugd/b2dd23_781bdb1b27314ec4acc45f4b821320d8.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Primary source
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
          <div>
            <p className="font-display text-5xl leading-none text-teal-deep">84%</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
              Searches without case numbers
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              FOIA-derived Flock network logs showed most queries carried no case number — making
              unauthorized use hard to detect. Flock&apos;s own CEO later announced mandatory case
              codes after years of voluntary adoption.
            </p>
          </div>
          <div>
            <p className="font-display text-5xl leading-none text-teal-deep">60+</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
              Condor cameras exposed
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              In Dec 2025, researchers found Flock Condor PTZ cameras livestreaming to the open
              internet with no login — including archive download and admin controls.{" "}
              <a
                className="font-medium text-teal-deep underline underline-offset-2"
                href="/media"
              >
                Media &amp; sources
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-muted">
          On August 13, 2026, Flock CEO Garrett Langley announced mandatory Audit Assistance and
          case codes, shorter default retention, and admitted prior contract language
          &ldquo;confused the public&rdquo; about data ownership — admissions that the prior
          voluntary system was inadequate.{" "}
          <a
            className="font-medium text-teal-deep underline underline-offset-2"
            href="https://www.flocksafety.com/blog/flock-guardrails-address-lpr-privacy-concerns-and-police-transparency"
            target="_blank"
            rel="noreferrer"
          >
            Flock blog
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" id="how-it-works">
        <h2 id="how-heading" className="font-display text-3xl text-ink sm:text-4xl">
          How it works
        </h2>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Four steps from encounter to attorney-ready templates. Technical terms stay here — not in
          the hero.
        </p>
        <ol className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((step) => (
            <li key={step.n} className="relative border-t border-teal/30 pt-4">
              <span className="font-mono text-xs font-medium text-teal">{step.n}</span>
              <h3 className="mt-2 font-display text-2xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Comparison */}
      <section aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="font-display text-3xl text-ink sm:text-4xl">
          What “proof” looks like today
        </h2>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Most ALPR / surveillance evidence rests on vendor assertion. A proper chain lets someone
          else verify.
        </p>
        <div className="mt-8 grid gap-0 overflow-hidden rounded-2xl border border-line sm:grid-cols-2">
          <div className="border-b border-line bg-ink/[0.03] p-5 sm:border-b-0 sm:border-r sm:p-7">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Typical surveillance evidence today
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
              <li>No public hardware hash at capture</li>
              <li>Audit logs the vendor can alter</li>
              <li>“This is what the camera recorded” — trust us</li>
              <li>Hot-list alerts that can stop the wrong person</li>
              <li>Optional case codes and abuse detection</li>
            </ul>
          </div>
          <div className="bg-teal-soft/40 p-5 sm:p-7">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-teal-deep">
              A verifiable trust chain
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
              <li>Content fingerprint (SHA-256) at secure-time</li>
              <li>Merkle root binding recording + notes</li>
              <li>Independent verify endpoint anyone can re-check</li>
              <li>Templates arguing FRE 901 / 702 gaps in vendor systems</li>
              <li>Open-source standards cities can put in contracts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footage types + sample */}
      <section aria-labelledby="types-heading" className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 id="types-heading" className="font-display text-3xl text-ink sm:text-4xl">
            Three footage types
          </h2>
          <ul className="mt-6 space-y-5 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Fixed / ALPR surveillance</strong> — Flock, Motorola,
              Genetec, Verkada, and similar. Authentication, accuracy, suppression, civil demand.
            </li>
            <li>
              <strong className="text-ink">Body-worn</strong> — Missing, partial, or recorded.
              Failure-to-record plus authenticity of what exists.
            </li>
            <li>
              <strong className="text-ink">Cell phone / civilian</strong> — Your recording or theirs.
              Provenance, deepfake risk, Challenge Evidence session IDs for counsel.
            </li>
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            Open standards and model language live on{" "}
            <a
              className="font-medium text-teal-deep underline underline-offset-2"
              href="https://github.com/danielsmithdevelopment/surveillance-evidence-integrity"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            : authentication challenge guide, model contract language, model legislation.
          </p>
        </div>

        <aside
          className="rounded-2xl border border-line bg-ink px-5 py-6 font-mono text-[11px] leading-relaxed text-white/85 sm:px-6"
          aria-label="Sample FRE 901 motion excerpt"
        >
          <p className="text-teal-soft/90">SAMPLE · FRE 901 MOTION (REDACTED)</p>
          <p className="mt-4 text-white">MOTION IN LIMINE TO EXCLUDE SURVEILLANCE FOOTAGE</p>
          <p className="mt-3 text-white/70">
            …proponent cannot satisfy FRE 901(b)(9). No cryptographic hash computed within camera
            hardware at capture. No Merkle-chained audit log. No external immutable anchor…
          </p>
          <p className="mt-3 text-white/70">
            …LAPD OIG (July 10, 2026): 32.3% false positives on actionable hot-list alerts…
          </p>
          <p className="mt-3 text-white/50">Templates for attorney review — not legal advice.</p>
        </aside>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" id="faq">
        <h2 id="faq-heading" className="font-display text-3xl text-ink sm:text-4xl">
          FAQ
        </h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-ink outline-none marker:content-none focus-visible:text-teal [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span
                    className="mt-0.5 shrink-0 text-teal transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <aside
        className="rounded-2xl border border-amber/30 bg-amber/5 px-5 py-4 text-sm leading-relaxed text-ink sm:px-6"
        role="note"
      >
        <strong className="font-semibold">Not legal advice.</strong> Generated documents are
        templates for attorney review. No attorney-client relationship is created. Factual claims
        are sourced to public documentation — verify before filing.{" "}
        <a className="font-medium text-teal-deep underline underline-offset-2" href="/terms">
          Terms of Service
        </a>
      </aside>
    </div>
  );
}
