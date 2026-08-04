export function SiteNav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
      <a href="/" className="font-display text-lg tracking-tight text-ink/80 transition hover:text-ink sm:text-xl">
        Challenge the Footage
      </a>
      <div className="flex items-center gap-5 text-sm font-medium text-ink-muted">
        <a href="/public-defenders.html" className="transition hover:text-teal">
          Public defenders
        </a>
        <a href="/terms.html" className="transition hover:text-teal">
          Terms
        </a>
        <a
          href="https://github.com/danielsmithdevelopment/surveillance-evidence-integrity"
          className="hidden transition hover:text-teal sm:inline"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70 px-5 py-10 text-center text-sm text-ink-muted sm:px-8">
      <p>
        Built by{" "}
        <a className="text-teal-deep underline-offset-2 hover:underline" href="https://github.com/danielsmithdevelopment">
          Daniel Smith
        </a>
        {" · "}
        Powered by{" "}
        <a className="text-teal-deep underline-offset-2 hover:underline" href="https://clawql.com">
          ClawQL
        </a>
      </p>
      <p className="mt-2">Templates for attorney review — not legal advice.</p>
    </footer>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.95rem] font-normal text-ink outline-none transition placeholder:text-ink-muted/55 focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-deep disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45";

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-line bg-white/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-teal/40 hover:bg-white";
