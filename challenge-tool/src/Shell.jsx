import { useEffect, useId, useState } from "react";
import { isIosSafari, isStandaloneDisplay, registerServiceWorker } from "./pwa.js";

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

export function InstallAppControl() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const tipId = useId();

  useEffect(() => {
    registerServiceWorker();
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return undefined;
    }

    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      setShowIosTip(false);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferred) {
    return (
      <li>
        <button
          type="button"
          className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          onClick={async () => {
            deferred.prompt();
            try {
              await deferred.userChoice;
            } catch {
              /* user dismissed */
            }
            setDeferred(null);
          }}
        >
          Install app
        </button>
      </li>
    );
  }

  if (isIosSafari()) {
    return (
      <li className="relative">
        <button
          type="button"
          className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          aria-expanded={showIosTip}
          aria-controls={tipId}
          onClick={() => setShowIosTip((v) => !v)}
        >
          Add to Home Screen
        </button>
        {showIosTip ? (
          <span
            id={tipId}
            role="status"
            className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-white p-3 text-left text-xs leading-relaxed text-ink shadow-[0_12px_40px_rgba(18,26,33,0.12)]"
          >
            Tap Share, then <strong>Add to Home Screen</strong> to install Challenge the Footage like
            an app.
          </span>
        ) : null}
      </li>
    );
  }

  return null;
}

export function SiteNav() {
  return (
    <nav
      className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7"
      aria-label="Primary"
    >
      <a
        href="/"
        className="font-display text-lg tracking-tight text-ink transition hover:text-teal-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:text-xl"
      >
        Challenge the Footage
      </a>
      <ul className="m-0 flex list-none flex-wrap items-center justify-end gap-x-4 gap-y-2 p-0 text-sm font-medium text-ink sm:gap-5">
        <li>
          <a
            href="/evidence.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Evidence
          </a>
        </li>
        <li>
          <a
            href="/media.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Media
          </a>
        </li>
        <li>
          <a
            href="/public-defenders.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Public defenders
          </a>
        </li>
        <li className="hidden sm:list-item">
          <a
            href="/terms.html"
            className="text-ink-muted transition hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Terms
          </a>
        </li>
        <InstallAppControl />
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
        {" · "}
        <a
          className="font-medium text-teal-deep underline underline-offset-2 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          href="/media.html"
        >
          Media
        </a>
        {" · "}
        <a
          className="font-medium text-teal-deep underline underline-offset-2 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          href="/evidence.html"
        >
          Evidence
        </a>
      </p>
      <p className="mt-2">Templates for attorney review — not legal advice.</p>
      <p className="mt-2 text-xs">
        Install from your browser for a home-screen app experience on this device.
      </p>
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
  "inline-flex items-center justify-center rounded-xl bg-teal-deep px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:opacity-100";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:opacity-100";

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-teal/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
