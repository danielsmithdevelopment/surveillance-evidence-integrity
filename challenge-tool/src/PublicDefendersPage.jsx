import { SiteFooter, SiteNav, btnPrimary } from "./Shell.jsx";

export default function PublicDefendersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden">
        <div className="grain" aria-hidden="true" />
        <div
          className="aperture-ring pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px]"
          aria-hidden="true"
        />
        <SiteNav />
        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
          <p className="animate-rise text-[0.7rem] font-bold uppercase tracking-[0.14em] text-teal">
            Access program
          </p>
          <h1 className="font-display animate-rise mt-3 text-[clamp(2.6rem,6vw,4rem)] leading-[1.05] text-ink">
            Public defenders get free unlimited access
          </h1>
          <p className="animate-rise-delay mt-5 max-w-xl text-lg text-ink-muted">
            This tool exists to help people up against well-funded surveillance infrastructure.
            Public defenders are on the front line of that fight.
          </p>
        </div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 space-y-6 px-5 pb-16 sm:px-8">
        <section className="rounded-2xl border border-line bg-white/85 p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink">How to get access</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-ink-muted">
            <li>
              Email{" "}
              <a className="font-medium text-teal-deep underline" href="mailto:pd@challengethefootage.com">
                pd@challengethefootage.com
              </a>{" "}
              from your office address (<code className="font-mono text-sm">.gov</code>, PD office
              domain, or equivalent).
            </li>
            <li>We verify and whitelist your Google account within one business day.</li>
            <li>Sign in on the home page — entitlement returns unlimited generations, no Stripe.</li>
          </ol>
          <a href="mailto:pd@challengethefootage.com" className={`${btnPrimary} mt-6 inline-flex`}>
            Request free access
          </a>
        </section>

        <section className="rounded-2xl border border-line bg-white/85 p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink">Sponsor a generation</h2>
          <p className="mt-3 text-ink-muted">
            Law firms, organizations, and individuals can fund free generations for the public
            defender pool. Contact{" "}
            <a className="text-teal-deep underline" href="mailto:sponsor@challengethefootage.com">
              sponsor@challengethefootage.com
            </a>
            .
          </p>
        </section>

        <a href="/" className="inline-block text-sm font-semibold text-teal-deep hover:underline">
          ← Back to the generator
        </a>
      </main>

      <SiteFooter />
    </div>
  );
}
