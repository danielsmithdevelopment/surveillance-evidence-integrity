/**
 * Explains the evidence trust chain and how it improves authenticity / evidence quality.
 */
export function TrustChainSection({ compact = false }) {
  const steps = [
    {
      title: "Capture",
      body: "Record the encounter in the browser with time-stamped notes when you can safely add them.",
    },
    {
      title: "Integrity package",
      body: "At secure-time we compute content fingerprints (SHA-256) for the recording and notes, then bind them into a Merkle root for the session.",
    },
    {
      title: "Account custody",
      body: "The package is stored to your signed-in account so counsel can retrieve a stable verification ID later.",
    },
    {
      title: "Independent verification",
      body: "A public verify endpoint exposes hashes, the Merkle root, and a how-to-verify checklist — so authenticity is checkable, not just asserted.",
    },
  ];

  return (
    <section
      aria-labelledby="trust-chain-heading"
      className={
        compact
          ? "rounded-2xl border border-line bg-white p-5 sm:p-6"
          : "rounded-2xl border border-line bg-white p-5 shadow-[0_18px_50px_rgba(18,26,33,0.06)] sm:p-8"
      }
    >
      <h2 id="trust-chain-heading" className="font-display text-2xl text-ink sm:text-3xl">
        The trust chain
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
        Better evidence quality means a clearer story from recording to courtroom: what was
        captured, that it was not silently swapped later, and that someone else can re-check the
        same fingerprints. That is the floor FRE 901 authentication expects — and what most vendor
        systems do not publicly prove.
      </p>
      <ol className="mt-6 grid gap-5 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-soft font-mono text-xs font-semibold text-teal-deep"
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
