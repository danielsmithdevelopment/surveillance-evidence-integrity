import { useCallback, useEffect, useRef, useState } from "react";
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
import { loadGoogleIdentity } from "./googleIdentity.js";

const API = typeof window !== "undefined" ? window.CTF_API_BASE || "" : "";
const ALL_PARTY = new Set(["CA", "CT", "FL", "IL", "MD", "MA", "MI", "MT", "NH", "PA", "WA"]);
const CONSENT_KEY = "ctf_evidence_consent_v1";

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

async function sha256Blob(blob) {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function DemoSignIn({ onCredential, allowTestAuth }) {
  const slot = useRef(null);

  useEffect(() => {
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId || !slot.current) return;
    let cancelled = false;
    loadGoogleIdentity().then((google) => {
      if (cancelled || !google?.accounts?.id || !slot.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          try {
            const payload = JSON.parse(atob(resp.credential.split(".")[1]));
            onCredential(resp.credential, payload.email || null);
          } catch {
            onCredential(resp.credential, null);
          }
        },
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

  if (window.GOOGLE_CLIENT_ID) {
    return <div ref={slot} aria-label="Google Sign-In" />;
  }
  if (!allowTestAuth) {
    return (
      <p className="text-sm text-ink-muted">
        Sign in with Google after deploy to save evidence to your account.
      </p>
    );
  }
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={() => {
        const id = `demo-ev-${Date.now()}`;
        onCredential(`test:${id}:demo.attorney@example.com`, "demo.attorney@example.com");
      }}
    >
      Continue with local demo account
    </button>
  );
}

export default function EvidencePage() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [allowTestAuth, setAllowTestAuth] = useState(false);
  const [stateCode, setStateCode] = useState("CA");
  const [consented, setConsented] = useState(() => !!localStorage.getItem(CONSENT_KEY));
  const [phase, setPhase] = useState("ready"); // ready | recording | securing | done
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [live, setLive] = useState(false);
  const [claimInfo, setClaimInfo] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);

  const videoRef = useRef(null);
  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then((r) => r.json())
      .then((h) => setAllowTestAuth(!!h.testAuthEnabled))
      .catch(() => setAllowTestAuth(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const claim = params.get("claim");
    const code = params.get("code");
    if (claim && code) setClaimInfo({ sessionId: claim, claimCode: code });
  }, []);

  const refreshSessions = useCallback(() => {
    if (!token) return;
    api("/api/evidence/sessions", { token })
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setSessions([]));
  }, [token]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!token || !claimInfo) return;
    let cancelled = false;
    setClaimStatus("Linking evidence to your account…");
    api("/api/evidence/claim", {
      method: "POST",
      token,
      body: claimInfo,
    })
      .then((d) => {
        if (cancelled) return;
        setClaimStatus(
          d.alreadyClaimed
            ? "This evidence was already linked to your account."
            : "Evidence linked to your account."
        );
        setSession({
          sessionId: d.sessionId,
          status: d.status,
          verificationId: d.verificationId || d.sessionId,
        });
        refreshSessions();
        const url = new URL(window.location.href);
        url.searchParams.delete("claim");
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);
      })
      .catch((e) => {
        if (!cancelled) setClaimStatus(e.message || "Could not link evidence");
      });
    return () => {
      cancelled = true;
    };
  }, [token, claimInfo, refreshSessions]);

  const onCredential = (cred, mail) => {
    setToken(cred);
    setEmail(mail || null);
  };

  const acceptConsent = () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ at: new Date().toISOString(), state: stateCode.toUpperCase() })
    );
    setConsented(true);
  };

  const allParty = ALL_PARTY.has(stateCode.toUpperCase());

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      mediaRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        void secureRecording(mime);
      };
      startedAtRef.current = new Date().toISOString();
      rec.start(1000);
      setPhase("recording");
      setLive(true);
      setStatus("Recording… stay safe. Stop when the encounter ends.");
    } catch (e) {
      setError(e.message || "Camera / microphone permission required");
    }
  }

  function stopRecording() {
    setStatus("Stopping…");
    setLive(false);
    recorderRef.current?.stop();
    mediaRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function secureRecording(mimeType) {
    setPhase("securing");
    setStatus("Building the trust chain…");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      const videoHash = await sha256Blob(blob);
      // Web capture is a single A/V container for now — audio hash mirrors video until
      // server-side extract exists. Transcript hash covers operator notes + placeholder.
      const transcriptText =
        notes.trim() ||
        `[Web capture ${startedAtRef.current || new Date().toISOString()}] No notes provided.`;
      const transcriptHash = await sha256Text(transcriptText);
      const audioHash = videoHash;

      if (!token) {
        throw new Error("Sign in to secure evidence to your account");
      }

      const result = await api("/api/evidence/secure", {
        method: "POST",
        token,
        body: {
          transcriptHash,
          audioHash,
          videoHash,
          transcriptText,
          mimeType: mimeType || "video/webm",
          startedAt: startedAtRef.current,
          endedAt: new Date().toISOString(),
          stateCode: stateCode.toUpperCase(),
          source: "web",
        },
      });
      setSession(result);
      setPhase("done");
      setStatus("Evidence secured — trust chain ready.");
      refreshSessions();
    } catch (e) {
      setError(e.message || String(e));
      setPhase("ready");
      setStatus("");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="relative overflow-hidden">
        <div className="grain" aria-hidden="true" />
        <SiteNav />
        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-12 pt-14 sm:px-8 sm:pt-20">
          <p className="animate-rise text-[0.7rem] font-bold uppercase tracking-[0.14em] text-teal">
            Evidence
          </p>
          <h1 className="font-display animate-rise mt-3 text-[clamp(2.6rem,6vw,4rem)] leading-[1.05] text-ink">
            Record the encounter. Keep the proof.
          </h1>
          <p className="animate-rise-delay mt-5 max-w-xl text-lg text-ink-muted">
            Capture video in the browser, seal it into a verifiable trust chain on your account,
            then prepare documents. Install this site to your Home Screen for a near-native
            experience.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {!token ? (
              <DemoSignIn onCredential={onCredential} allowTestAuth={allowTestAuth} />
            ) : (
              <p
                className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm"
                aria-live="polite"
              >
                Signed in as <strong>{email || "account"}</strong>
              </p>
            )}
            <a className={btnGhost} href="/">
              Prepare documents
            </a>
          </div>
          {claimInfo && (
            <p className="mt-4 text-sm text-ink" role="status">
              {token
                ? claimStatus || "Linking…"
                : "Sign in to link the recording waiting for this account."}
            </p>
          )}
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-5 pb-16 outline-none sm:px-8"
      >
        <div className="mb-8">
          <TrustChainSection compact />
        </div>

        {!consented && (
          <section
            aria-labelledby="consent-heading"
            className="mb-8 rounded-2xl border border-line bg-white p-5 sm:p-8"
          >
            <h2 id="consent-heading" className="font-display text-2xl text-ink">
              Before you record
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Recording laws vary. This is not legal advice. In all-party consent states, notify the
              officer that you are recording.
            </p>
            <div className="mt-4 max-w-xs">
              <Field label="Your state">
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={stateCode}
                    maxLength={2}
                    onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                    aria-describedby="consent-desc"
                  />
                )}
              </Field>
            </div>
            <p id="consent-desc" className="mt-3 text-sm text-ink">
              {allParty
                ? `${stateCode.toUpperCase()} is treated as an all-party consent state here — notify before relying on the recording in court.`
                : `${stateCode.toUpperCase()}: rules still vary. Notify when appropriate and consult an attorney.`}
            </p>
            <button type="button" className={`${btnPrimary} mt-5`} onClick={acceptConsent}>
              I understand — continue
            </button>
          </section>
        )}

        {consented && (
          <section
            aria-labelledby="record-heading"
            className="rounded-2xl border border-line bg-white p-5 sm:p-8"
          >
            <h2 id="record-heading" className="font-display text-2xl text-ink">
              Record
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Uses your device camera in the browser. When you stop, we build the integrity package
              (content fingerprints + Merkle root) and save it to your account so counsel can verify
              later.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl bg-ink/95">
              <video
                ref={videoRef}
                className="aspect-[3/4] w-full object-cover sm:aspect-video"
                playsInline
                muted
                aria-label="Live camera preview"
              />
            </div>

            <div className="mt-4">
              <Field label="Optional notes (included in the secured package)">
                {(id) => (
                  <textarea
                    id={id}
                    className={`${inputClass} min-h-[88px]`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={phase === "recording" || phase === "securing"}
                    placeholder="Badge number, location, what was said…"
                  />
                )}
              </Field>
            </div>

            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {status && (
              <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
                {status}
                {live ? " ●" : ""}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {phase === "ready" || phase === "done" ? (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={startRecording}
                  disabled={!consented}
                >
                  Start recording
                </button>
              ) : null}
              {phase === "recording" ? (
                <button type="button" className={btnSecondary} onClick={stopRecording}>
                  Stop &amp; secure
                </button>
              ) : null}
              {phase === "securing" ? (
                <button type="button" className={btnPrimary} disabled>
                  Securing…
                </button>
              ) : null}
            </div>

            {session && (
              <div className="mt-8 border-t border-line pt-6" role="status">
                <h3 className="font-display text-xl text-ink">Evidence secured</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Verification ID <code className="font-mono text-ink">{session.sessionId}</code>
                  {session.status === "anchored"
                    ? " · independently verifiable"
                    : " · integrity package on file (independent verification pending)"}
                </p>
                <a
                  className={`${btnPrimary} mt-4`}
                  href={`/?evidenceSession=${encodeURIComponent(session.sessionId)}`}
                >
                  Use this evidence in documents
                </a>
              </div>
            )}
          </section>
        )}

        {token && sessions.length > 0 && (
          <section aria-labelledby="library-heading" className="mt-10">
            <h2 id="library-heading" className="font-display text-2xl text-ink">
              Your evidence
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Saved to this account. Card payments apply only when you generate document packs.
            </p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {sessions.map((s) => (
                <li
                  key={s.sessionId}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-mono text-sm text-ink">{s.sessionId}</p>
                    <p className="text-xs text-ink-muted">
                      {s.securedAt || s.endedAt || "—"} · {s.status || "secured"}
                    </p>
                  </div>
                  <a
                    className="text-sm font-semibold text-teal-deep underline underline-offset-2"
                    href={`/?evidenceSession=${encodeURIComponent(s.sessionId)}`}
                  >
                    Prepare docs
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
