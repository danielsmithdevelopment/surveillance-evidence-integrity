import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Field,
  SiteFooter,
  SiteNav,
  SkipLink,
  btnGhost,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "./Shell.jsx";
import { TrustChainSection } from "./TrustChain.jsx";
import { registerWebMcpTools } from "./webmcp.js";
import {
  BODY_CAM_RECORDING_STATUSES,
  FOOTAGE_CATEGORIES,
  getFootageCategory,
} from "../footage-modes.js";

import { loadGoogleIdentity } from "./googleIdentity.js";

const TOS_KEY = "surv_tos_v1";
const API = typeof window !== "undefined" ? window.CTF_API_BASE || "" : "";

const ALL_VENDORS = [
  { id: "flock", label: "Flock Safety" },
  { id: "axon", label: "Axon" },
  { id: "motorola", label: "Motorola Solutions (Vigilant)" },
  { id: "genetec", label: "Genetec" },
  { id: "verkada", label: "Verkada" },
  { id: "cellphone", label: "Cell phone / personal device" },
  { id: "custom", label: "Other / custom source" },
];

const DOC_TABS = [
  { key: "motion", label: "FRE 901", full: "Authentication" },
  { key: "accuracy", label: "FRE 702", full: "Daubert" },
  { key: "access", label: "4th Amend.", full: "Suppression" },
  { key: "civil", label: "§ 1983", full: "Demand letter" },
];

function api(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

function TosModal({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef(null);
  const checkboxId = useId();
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const node = dialogRef.current;
    const focusable = node?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 px-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-[0_24px_80px_rgba(18,26,33,0.18)] sm:p-8"
      >
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-teal">
          Before you generate
        </p>
        <h2 id={titleId} className="font-display mt-2 text-3xl text-ink">
          Terms of Service
        </h2>
        <div
          className="mt-4 max-h-52 space-y-3 overflow-y-auto rounded-xl border border-line bg-paper/80 p-4 text-sm leading-relaxed text-ink"
          role="region"
          aria-label="Terms of Service summary"
        >
          <p>
            Challenge the Footage generates <strong>document templates for attorney review</strong>.
            It is not a law firm and does not create an attorney-client relationship. Nothing here
            is legal advice.
          </p>
          <p>
            You agree to have every generated document reviewed by a licensed attorney in your
            jurisdiction before filing or sending it, and to independently verify all factual
            claims.
          </p>
          <p>
            Full terms:{" "}
            <a
              className="font-medium text-teal-deep underline"
              href="/terms.html"
              target="_blank"
              rel="noreferrer"
            >
              Terms of Service page
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
        <div className="mt-5 flex items-start gap-3 text-sm text-ink">
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-1 size-4 rounded border-line text-teal focus:ring-teal"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <label htmlFor={checkboxId} className="cursor-pointer">
            I have read and agree to the Terms of Service
          </label>
        </div>
        <button
          type="button"
          className={`${btnPrimary} mt-5 w-full`}
          disabled={!checked}
          onClick={() => {
            if (!checked) return;
            localStorage.setItem(TOS_KEY, new Date().toISOString());
            onAccept();
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function SignIn({ onCredential, allowTestAuth }) {
  const slot = useRef(null);

  useEffect(() => {
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId || !slot.current) return;
    let cancelled = false;
    loadGoogleIdentity().then((google) => {
      if (cancelled || !google?.accounts?.id || !slot.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => onCredential(resp.credential),
      });
      google.accounts.id.renderButton(slot.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 260,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!window.GOOGLE_CLIENT_ID) {
    return (
      <div className="flex max-w-sm flex-col gap-3">
        <p className="text-sm leading-snug text-ink-muted">
          Sign in with Google after deploy — set{" "}
          <code className="font-mono text-[0.8rem] text-teal-deep">GOOGLE_CLIENT_ID</code>
        </p>
        {allowTestAuth ? (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              const id = `demo-ui-${Date.now()}`;
              onCredential(`test:${id}:demo.attorney@example.com`, {
                testAuth: true,
                email: "demo.attorney@example.com",
              });
            }}
          >
            Continue with local demo account
          </button>
        ) : null}
      </div>
    );
  }
  return <div ref={slot} aria-label="Google Sign-In" />;
}

export default function App() {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [tosOk, setTosOk] = useState(() => !!localStorage.getItem(TOS_KEY));
  const [entitlement, setEntitlement] = useState(null);
  const [allowTestAuth, setAllowTestAuth] = useState(false);
  const [footageCategory, setFootageCategory] = useState("fixed_surveillance");
  const [bodyCamRecordingStatus, setBodyCamRecordingStatus] = useState("missing");
  const [vendor, setVendor] = useState("flock");
  const [customVendorName, setCustomVendorName] = useState("");
  const [form, setForm] = useState({
    caseNumber: "",
    defendant: "",
    court: "",
    jurisdiction: "",
    city: "",
    cameraType: "",
    additionalFacts: "",
    searchFacts: "",
    civilHarm: "",
    additionalVendorFacts: "",
  });
  const categoryMeta = getFootageCategory(footageCategory);
  const vendorOptions = ALL_VENDORS.filter((v) => categoryMeta.vendorIds.includes(v.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [docs, setDocs] = useState(null);
  const [tab, setTab] = useState("motion");
  const [evidenceSession, setEvidenceSession] = useState(null);
  const formRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("evidenceSession") || params.get("witnessSession");
    if (sessionId) {
      setEvidenceSession(sessionId);
      setForm((f) => ({
        ...f,
        additionalFacts:
          `${f.additionalFacts || ""}\n\nEvidence recording session: ${sessionId}\n`.trim(),
      }));
    }
  }, []);

  useEffect(() => registerWebMcpTools(), []);

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then((r) => r.json())
      .then((h) => setAllowTestAuth(!!h.testAuthEnabled))
      .catch(() => setAllowTestAuth(false));
  }, []);

  const onCredential = useCallback((cred, meta) => {
    setToken(cred);
    if (meta?.email) {
      setUserEmail(meta.email);
      return;
    }
    try {
      const payload = JSON.parse(atob(cred.split(".")[1]));
      setUserEmail(payload.email || null);
    } catch {
      setUserEmail(null);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    api("/api/entitlement", { token })
      .then(setEntitlement)
      .catch((e) => setError(e.message));
  }, [token]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCheckout() {
    setError(null);
    setBusy(true);
    try {
      const data = await api("/api/checkout", {
        method: "POST",
        token,
        body: {
          origin: window.location.origin,
          successUrl: `${window.location.origin}?payment=success`,
          cancelUrl: `${window.location.origin}?payment=cancelled`,
        },
      });
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!tosOk) return;
    setError(null);
    setBusy(true);
    try {
      const data = await api("/api/generate", {
        method: "POST",
        token,
        body: {
          tosAccepted: true,
          footageCategory,
          bodyCamRecordingStatus:
            footageCategory === "body_worn" ? bodyCamRecordingStatus : undefined,
          vendor: vendor === "custom" ? "custom" : vendor,
          customVendorName:
            vendor === "custom"
              ? customVendorName
              : vendor === "cellphone"
                ? customVendorName || undefined
                : undefined,
          ...form,
        },
      });
      setSessionId(data.sessionId);
      setDocs(data.docs);
      setTab("motion");
      const ent = await api("/api/entitlement", { token });
      setEntitlement(ent);
    } catch (e) {
      if (e.status === 402) {
        setError("Free generation used. Purchase a $9 generation to continue.");
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadCurrent() {
    if (!docs) return;
    const blob = new Blob([docs[tab] || ""], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionId || "challenge"}-${tab}.md`;
    a.click();
  }

  function copyCurrent() {
    if (!docs) return;
    navigator.clipboard.writeText(docs[tab] || "");
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formRef.current?.querySelector("select, input, textarea")?.focus();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {!tosOk && <TosModal onAccept={() => setTosOk(true)} />}

      <header className="relative overflow-hidden">
        <div className="grain" aria-hidden="true" />
        <div
          className="aperture-ring pointer-events-none absolute -right-24 top-[-20%] h-[520px] w-[520px] opacity-90 sm:right-0"
          aria-hidden="true"
        />
        <SiteNav />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <div className="animate-rise">
            <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] leading-[0.95] tracking-tight text-ink">
              Challenge
              <br />
              <span className="italic text-teal-deep">the Footage</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted sm:text-xl">
              Secure a verifiable trust chain for what you capture, then generate attorney-review
              challenge documents — one account.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {!token ? (
                <SignIn onCredential={onCredential} allowTestAuth={allowTestAuth} />
              ) : (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm"
                  aria-live="polite"
                >
                  <span>
                    Signed in as <strong>{userEmail || "Google user"}</strong>
                  </span>
                  {entitlement?.testAuth && (
                    <span className="rounded-md bg-teal px-2 py-0.5 text-xs font-semibold text-white">
                      Local demo
                    </span>
                  )}
                  {entitlement?.isPD && (
                    <span className="rounded-md bg-teal px-2 py-0.5 text-xs font-semibold text-white">
                      PD · unlimited
                    </span>
                  )}
                  {entitlement && !entitlement.isPD && !entitlement.testAuth && (
                    <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">
                      {entitlement.canGenerate
                        ? entitlement.entitled
                          ? "Paid access"
                          : `Free ${entitlement.freeUsed}/${entitlement.freeAllowed}`
                        : "Payment required"}
                    </span>
                  )}
                </div>
              )}
              <button type="button" className={btnGhost} onClick={scrollToForm}>
                Start a generation
              </button>
            </div>
          </div>

          <div
            className="animate-rise-delay relative hidden min-h-[280px] lg:block"
            aria-hidden="true"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-teal/20 via-white/40 to-amber/15" />
            <div className="absolute inset-6 rounded-[1.5rem] border border-white/60 bg-ink/[0.03] backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex flex-col justify-between p-10 font-mono text-[11px] leading-relaxed text-ink-muted">
              <div>
                <p className="text-teal">VECTORS</p>
                <p className="mt-3 text-ink">01 FRE 901 · chain of custody</p>
                <p className="text-ink">02 FRE 702 · 0.1% floor</p>
                <p className="text-ink">03 4th Amendment · case numbers</p>
                <p className="text-ink">04 § 1983 · wrongful stop</p>
              </div>
              <div>
                <p>Flock · Axon · Motorola</p>
                <p>Genetec · Verkada · custom</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-16 outline-none sm:px-8"
      >
        {evidenceSession && (
          <div
            className="mb-6 rounded-xl border border-teal/25 bg-teal-soft/70 px-4 py-3 text-sm text-ink animate-fade"
            role="status"
          >
            Evidence session linked: <code className="font-mono">{evidenceSession}</code>
            {" · "}
            <a className="font-medium text-teal-deep underline" href="/evidence.html">
              Evidence library
            </a>
          </div>
        )}

        <div className="mb-8">
          <TrustChainSection compact />
        </div>

        <section
          ref={formRef}
          aria-labelledby="case-details-heading"
          className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_50px_rgba(18,26,33,0.06)] sm:p-8"
        >
          <div className="mb-6">
            <h2 id="case-details-heading" className="font-display text-3xl text-ink">
              Case details
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Free first generation · $9 after ·{" "}
              <a
                className="font-medium text-teal-deep underline underline-offset-2 hover:text-teal"
                href="/public-defenders.html"
              >
                public defenders free
              </a>
            </p>
          </div>

          <div className="mb-4">
            <Field label="Footage category">
              {(id) => (
                <select
                  id={id}
                  className={inputClass}
                  value={footageCategory}
                  disabled={!token}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFootageCategory(next);
                    const meta = getFootageCategory(next);
                    setVendor(meta.defaultVendor);
                    setCustomVendorName("");
                    if (next === "body_worn") setBodyCamRecordingStatus("missing");
                  }}
                >
                  {FOOTAGE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <p className="mt-2 text-sm text-ink-muted">{categoryMeta.description}</p>
          </div>

          {footageCategory === "body_worn" && (
            <div className="mb-4">
              <Field label="Body-cam recording status">
                {(id) => (
                  <select
                    id={id}
                    className={inputClass}
                    value={bodyCamRecordingStatus}
                    disabled={!token}
                    onChange={(e) => setBodyCamRecordingStatus(e.target.value)}
                  >
                    {BODY_CAM_RECORDING_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <p className="mt-2 text-sm text-ink-muted">
                {BODY_CAM_RECORDING_STATUSES.find((s) => s.id === bodyCamRecordingStatus)?.stage}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={categoryMeta.sourceLabel}>
              {(id) => (
                <select
                  id={id}
                  className={inputClass}
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  disabled={!token}
                >
                  {vendorOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {(vendor === "custom" || vendor === "cellphone") && (
              <Field
                label={vendor === "cellphone" ? "Optional device label" : "Custom source name"}
              >
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={customVendorName}
                    onChange={(e) => setCustomVendorName(e.target.value)}
                    placeholder={
                      vendor === "cellphone"
                        ? "e.g. bystander's iPhone, officer personal phone"
                        : "Vendor / source legal name"
                    }
                    autoComplete="organization"
                  />
                )}
              </Field>
            )}
            <Field label="Case number">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.caseNumber}
                  onChange={(e) => updateField("caseNumber", e.target.value)}
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Defendant / client">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.defendant}
                  onChange={(e) => updateField("defendant", e.target.value)}
                  autoComplete="name"
                />
              )}
            </Field>
            <Field label="Court">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.court}
                  onChange={(e) => updateField("court", e.target.value)}
                />
              )}
            </Field>
            <Field label="Jurisdiction">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.jurisdiction}
                  onChange={(e) => updateField("jurisdiction", e.target.value)}
                  placeholder="e.g. C.D. Cal. / California Superior Court"
                />
              )}
            </Field>
            <Field label="City / agency">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  autoComplete="address-level2"
                />
              )}
            </Field>
            <Field label="Camera / footage type">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={form.cameraType}
                  onChange={(e) => updateField("cameraType", e.target.value)}
                  placeholder={categoryMeta.cameraPlaceholder}
                />
              )}
            </Field>
          </div>

          <Field label="Additional case facts" className="mt-4">
            {(id) => (
              <textarea
                id={id}
                className={`${inputClass} min-h-28 resize-y`}
                value={form.additionalFacts}
                onChange={(e) => updateField("additionalFacts", e.target.value)}
                placeholder="What happened, when, which officers, how the footage is being used…"
              />
            )}
          </Field>
          <Field label="Search / access / custody facts (Fourth Amendment)" className="mt-4">
            {(id) => (
              <textarea
                id={id}
                className={`${inputClass} min-h-24 resize-y`}
                value={form.searchFacts}
                onChange={(e) => updateField("searchFacts", e.target.value)}
                placeholder={categoryMeta.searchPlaceholder}
              />
            )}
          </Field>
          <Field label="Civil harm (§ 1983)" className="mt-4">
            {(id) => (
              <textarea
                id={id}
                className={`${inputClass} min-h-24 resize-y`}
                value={form.civilHarm}
                onChange={(e) => updateField("civilHarm", e.target.value)}
                placeholder={categoryMeta.civilPlaceholder}
              />
            )}
          </Field>
          {(vendor === "custom" || vendor === "cellphone") && (
            <Field
              label={
                footageCategory === "cellphone"
                  ? "Additional phone / provenance facts"
                  : "Additional vendor facts"
              }
              className="mt-4"
            >
              {(id) => (
                <textarea
                  id={id}
                  className={`${inputClass} min-h-24 resize-y`}
                  value={form.additionalVendorFacts}
                  onChange={(e) => updateField("additionalVendorFacts", e.target.value)}
                  placeholder={
                    footageCategory === "cellphone"
                      ? "Known edits, share path, extraction tool, missing original file…"
                      : undefined
                  }
                />
              )}
            </Field>
          )}

          {error && (
            <p
              className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={btnPrimary}
              disabled={!token || !tosOk || busy || (entitlement && !entitlement.canGenerate)}
              onClick={handleGenerate}
              aria-busy={busy}
            >
              {busy ? "Generating…" : "Generate all four documents"}
            </button>
            {entitlement && !entitlement.canGenerate && !entitlement.isPD && (
              <button
                type="button"
                className={btnSecondary}
                disabled={busy}
                onClick={handleCheckout}
              >
                Pay $9 — unlock generation
              </button>
            )}
          </div>
        </section>

        {docs && (
          <section
            className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_50px_rgba(18,26,33,0.06)] animate-rise sm:p-8"
            aria-labelledby="generated-docs-heading"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="generated-docs-heading" className="font-display text-3xl text-ink">
                  Generated documents
                </h2>
                <p className="mt-1 font-mono text-xs text-ink-muted">Session {sessionId}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnGhost} onClick={copyCurrent}>
                  Copy
                </button>
                <button type="button" className={btnGhost} onClick={downloadCurrent}>
                  Download .md
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Document type">
              {DOC_TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    id={`${panelId}-tab-${t.key}`}
                    aria-selected={active}
                    aria-controls={`${panelId}-panel`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setTab(t.key)}
                    className={`rounded-xl border px-3.5 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                      active
                        ? "border-teal bg-teal text-white"
                        : "border-line bg-white text-ink hover:border-teal/40"
                    }`}
                  >
                    <span className="block font-semibold">{t.label}</span>
                    <span className={`block text-xs ${active ? "text-white" : "text-ink-muted"}`}>
                      {t.full}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`${panelId}-panel`}
              aria-labelledby={`${panelId}-tab-${tab}`}
              className="mt-5"
            >
              <pre className="max-h-[min(70vh,720px)] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-ink p-5 font-mono text-[0.78rem] leading-relaxed text-[#e7eef2]">
                {docs[tab]}
              </pre>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
