import { useId } from "react";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

export function SiteNav() {
  return (
    <nav
      className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7"
      aria-label="Primary"
    >
      <a
        href="/"
        className="font-display text-lg tracking-tight text-ink transition hover:text-teal-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:text-xl"
      >
        Challenge the Footage
      </a>
      <ul className="m-0 flex list-none items-center gap-5 p-0 text-sm font-medium text-ink">
        <li>
          <a
            href="/public-defenders.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Public defenders
          </a>
        </li>
        <li>
          <a
            href="/terms.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Terms
          </a>
        </li>
        <li className="hidden sm:list-item">
          <a
            href="https://github.com/danielsmithdevelopment/surveillance-evidence-integrity"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70 px-5 py-10 text-center text-sm text-ink-muted sm:px-8">
      <p>
        Built by{" "}
        <a
          className="font-medium text-teal-deep underline underline-offset-2 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          href="https://github.com/danielsmithdevelopment"
        >
          Daniel Smith
        </a>
        {" · "}
        Powered by{" "}
        <a
          className="font-medium text-teal-deep underline underline-offset-2 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          href="https://clawql.com"
        >
          ClawQL
        </a>
      </p>
      <p className="mt-2">Templates for attorney review — not legal advice.</p>
    </footer>
  );
}

export function Field({ label, children, className = "", htmlFor }) {
  const autoId = useId();
  const id = htmlFor || autoId;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink"
      >
        {label}
      </label>
      {typeof children === "function" ? children(id) : children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.95rem] font-normal text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-teal focus:ring-2 focus:ring-teal/25 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-70";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45";

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-teal/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
