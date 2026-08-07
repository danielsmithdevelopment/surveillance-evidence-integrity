/** Lazily load Google Identity Services once when Sign-In is shown. */
let gisPromise = null;

export function loadGoogleIdentity() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ctf-gis="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("GIS load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.ctfGis = "1";
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("GIS load failed"));
    document.head.appendChild(script);
  }).catch(() => null);

  return gisPromise;
}
