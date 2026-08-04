/**
 * Challenge the Footage — frontend
 * Google Sign-In · vendor select · four document tabs · ToS gate (surv_tos_v1)
 *
 * Mounted from static/index.html. API base defaults to same origin.
 */

const { useState, useEffect, useCallback, useRef } = React;

const TOS_KEY = "surv_tos_v1";
const API = window.CTF_API_BASE || "";

const VENDORS = [
  { id: "flock", label: "Flock Safety" },
  { id: "axon", label: "Axon" },
  { id: "motorola", label: "Motorola Solutions (Vigilant)" },
  { id: "genetec", label: "Genetec" },
  { id: "verkada", label: "Verkada" },
  { id: "custom", label: "Other / custom vendor" },
];

const DOC_TABS = [
  { key: "motion", label: "FRE 901 — Authentication" },
  { key: "accuracy", label: "FRE 702 — Daubert" },
  { key: "access", label: "4th Amendment" },
  { key: "civil", label: "§ 1983 Demand" },
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
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tos-title">
      <div className="modal">
        <p className="eyebrow">Before you generate</p>
        <h2 id="tos-title">Terms of Service</h2>
        <div className="tos-scroll">
          <p>
            Challenge the Footage generates <strong>document templates for attorney review</strong>.
            It is not a law firm and does not create an attorney-client relationship. Nothing here is legal advice.
          </p>
          <p>
            You agree to have every generated document reviewed by a licensed attorney in your jurisdiction
            before filing or sending it, and to independently verify all factual claims.
          </p>
          <p>
            Full terms: <a href="/terms.html" target="_blank" rel="noopener noreferrer">/terms</a>
          </p>
        </div>
        <label className="check-row">
          <input type="checkbox" id="tos-check" />
          <span>I have read and agree to the Terms of Service</span>
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const ok = document.getElementById("tos-check").checked;
            if (!ok) return alert("Please accept the Terms of Service to continue.");
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

function SignIn({ onCredential }) {
  const slot = useRef(null);

  useEffect(() => {
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => onCredential(resp.credential),
    });
    window.google.accounts.id.renderButton(slot.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "signin_with",
      width: 280,
    });
  }, [onCredential]);

  return (
    <div className="sign-in">
      <div ref={slot} />
      {!window.GOOGLE_CLIENT_ID && (
        <p className="hint">Set <code>window.GOOGLE_CLIENT_ID</code> to enable Google Sign-In.</p>
      )}
    </div>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [tosOk, setTosOk] = useState(() => !!localStorage.getItem(TOS_KEY));
  const [entitlement, setEntitlement] = useState(null);
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [docs, setDocs] = useState(null);
  const [tab, setTab] = useState("motion");
  const [witnessSession, setWitnessSession] = useState(null);

  // Pre-populate from Witness handoff ?witnessSession=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ws = params.get("witnessSession");
    if (ws) {
      setWitnessSession(ws);
      setForm((f) => ({
        ...f,
        additionalFacts: (f.additionalFacts || "") +
          `\n\nWitness recording session: ${ws}\nVerification: https://challengethefootage.com/api/verify/${ws} (if Witness API is linked)\n`,
      }));
    }
    if (params.get("payment") === "success") {
      // Refresh entitlement after Stripe return
    }
  }, []);

  const onCredential = useCallback((cred) => {
    setToken(cred);
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
          vendor: vendor === "custom" ? "custom" : vendor,
          customVendorName: vendor === "custom" ? customVendorName : undefined,
          ...form,
        },
      });
      setSessionId(data.sessionId);
      setDocs(data.docs);
      setTab("motion");
      // Refresh entitlement counters
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
    const text = docs[tab] || "";
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionId || "challenge"}-${tab}.md`;
    a.click();
  }

  function copyCurrent() {
    if (!docs) return;
    navigator.clipboard.writeText(docs[tab] || "");
  }

  return (
    <div className="page">
      {!tosOk && <TosModal onAccept={() => setTosOk(true)} />}

      <header className="hero">
        <div className="hero-inner">
          <p className="brand">Challenge the Footage</p>
          <h1>Four motions. Any major surveillance vendor.</h1>
          <p className="lede">
            Generate FRE 901, FRE 702, Fourth Amendment, and §&nbsp;1983 templates pre-loaded with
            documented vendor facts — then have a lawyer review before you file.
          </p>
          <div className="cta-row">
            {!token ? (
              <SignIn onCredential={onCredential} />
            ) : (
              <p className="signed-as">
                Signed in as <strong>{userEmail || "Google user"}</strong>
                {entitlement?.isPD && <span className="badge">Public defender — unlimited</span>}
                {entitlement && !entitlement.isPD && (
                  <span className="badge muted">
                    {entitlement.canGenerate
                      ? entitlement.entitled
                        ? "Paid access"
                        : `Free gen ${entitlement.freeUsed}/${entitlement.freeAllowed}`
                      : "Payment required"}
                  </span>
                )}
              </p>
            )}
            <a className="text-link" href="/public-defenders.html">Public defenders: free access</a>
          </div>
        </div>
        <div className="hero-grain" aria-hidden="true" />
      </header>

      <main className="shell">
        {witnessSession && (
          <div className="banner">
            Witness session linked: <code>{witnessSession}</code>
          </div>
        )}

        <section className="panel">
          <h2>Case details</h2>
          <div className="grid">
            <label>
              Vendor
              <select value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={!token}>
                {VENDORS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </label>
            {vendor === "custom" && (
              <label>
                Custom vendor name
                <input
                  value={customVendorName}
                  onChange={(e) => setCustomVendorName(e.target.value)}
                  placeholder="Vendor legal name"
                />
              </label>
            )}
            <label>
              Case number
              <input value={form.caseNumber} onChange={(e) => updateField("caseNumber", e.target.value)} />
            </label>
            <label>
              Defendant / client
              <input value={form.defendant} onChange={(e) => updateField("defendant", e.target.value)} />
            </label>
            <label>
              Court
              <input value={form.court} onChange={(e) => updateField("court", e.target.value)} />
            </label>
            <label>
              Jurisdiction
              <input value={form.jurisdiction} onChange={(e) => updateField("jurisdiction", e.target.value)} placeholder="e.g. C.D. Cal. / California Superior Court" />
            </label>
            <label>
              City / agency
              <input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
            </label>
            <label>
              Camera / footage type
              <input value={form.cameraType} onChange={(e) => updateField("cameraType", e.target.value)} placeholder="ALPR hit, fixed CCTV, body-worn…" />
            </label>
          </div>

          <label className="full">
            Additional case facts
            <textarea
              rows={4}
              value={form.additionalFacts}
              onChange={(e) => updateField("additionalFacts", e.target.value)}
              placeholder="What happened, when, which officers, how the footage is being used…"
            />
          </label>
          <label className="full">
            Search / access facts (Fourth Amendment)
            <textarea
              rows={3}
              value={form.searchFacts}
              onChange={(e) => updateField("searchFacts", e.target.value)}
              placeholder="Case number on the query? Stated purpose? Officer query history if known…"
            />
          </label>
          <label className="full">
            Civil harm (§ 1983)
            <textarea
              rows={3}
              value={form.civilHarm}
              onChange={(e) => updateField("civilHarm", e.target.value)}
              placeholder="Wrongful stop, detention at gunpoint, arrest, lost wages, injury…"
            />
          </label>
          {vendor === "custom" && (
            <label className="full">
              Additional vendor facts
              <textarea
                rows={3}
                value={form.additionalVendorFacts}
                onChange={(e) => updateField("additionalVendorFacts", e.target.value)}
              />
            </label>
          )}

          {error && <p className="error" role="alert">{error}</p>}

          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={!token || !tosOk || busy || (entitlement && !entitlement.canGenerate)}
              onClick={handleGenerate}
            >
              {busy ? "Generating…" : "Generate all four documents"}
            </button>
            {entitlement && !entitlement.canGenerate && !entitlement.isPD && (
              <button type="button" className="btn secondary" disabled={busy} onClick={handleCheckout}>
                Pay $9 — unlock generation
              </button>
            )}
          </div>
          <p className="fine">
            Free first generation · $9 thereafter ·{" "}
            <a href="/public-defenders.html">Public defenders free</a> ·{" "}
            <a href="/terms.html">Terms</a>
          </p>
        </section>

        {docs && (
          <section className="panel results">
            <div className="results-head">
              <h2>Generated documents</h2>
              <p className="session">Session <code>{sessionId}</code></p>
            </div>
            <div className="tabs" role="tablist">
              {DOC_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={tab === t.key ? "tab active" : "tab"}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="doc-toolbar">
              <button type="button" className="btn ghost" onClick={copyCurrent}>Copy</button>
              <button type="button" className="btn ghost" onClick={downloadCurrent}>Download .md</button>
            </div>
            <pre className="doc-body">{docs[tab]}</pre>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Built by <a href="https://github.com/danielsmithdevelopment">Daniel Smith</a>
          {" · "}Powered by <a href="https://clawql.com">ClawQL</a>
          {" · "}<a href="https://github.com/danielsmithdevelopment/surveillance-evidence-integrity">Open source</a>
        </p>
        <p className="fine">Templates for attorney review — not legal advice.</p>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
