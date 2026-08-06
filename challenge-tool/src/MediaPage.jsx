import { SiteFooter, SiteNav, SkipLink } from "./Shell.jsx";
import { MEDIA_SECTIONS } from "./mediaStories.js";

function Story({ story }) {
  return (
    <article className="border-t border-line/80 py-7 first:border-t-0 first:pt-0">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {story.outlet}
        <span className="mx-2 font-normal text-line">·</span>
        {story.date}
      </p>
      <h3 className="font-display mt-2 text-[1.35rem] leading-snug text-ink sm:text-[1.5rem]">
        <a
          href={story.url}
          className="text-ink underline decoration-teal/35 underline-offset-[0.18em] transition hover:text-teal-deep hover:decoration-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          target="_blank"
          rel="noreferrer"
        >
          {story.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h3>
      <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-muted">{story.summary}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
        <span className="font-semibold text-teal-deep">Why it matters. </span>
        {story.whyItMatters}
      </p>
    </article>
  );
}

export default function MediaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <div className="relative overflow-hidden">
        <div className="grain" aria-hidden="true" />
        <div
          className="aperture-ring pointer-events-none absolute -right-28 top-8 h-[380px] w-[380px] opacity-80"
          aria-hidden="true"
        />
        <SiteNav />
        <header className="relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
          <p className="animate-rise text-[0.7rem] font-bold uppercase tracking-[0.14em] text-teal">
            Press &amp; research
          </p>
          <h1 className="font-display animate-rise mt-3 text-[clamp(2.6rem,6vw,4rem)] leading-[1.05] text-ink">
            Media &amp; sources
          </h1>
          <p className="animate-rise-delay mt-5 max-w-xl text-lg text-ink-muted">
            Reporting and primary sources behind Challenge the Footage’s vendor profiles and
            document templates — what happened, and why each item matters in court or procurement.
          </p>
        </header>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-5 pb-16 outline-none sm:px-8"
      >
        <nav aria-label="Sections on this page" className="mb-10">
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-medium">
            {MEDIA_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-teal-deep underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
                >
                  {section.title.replace(/^404 Media — /, "404 · ")}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {MEDIA_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
              <h2
                id={`${section.id}-heading`}
                className="font-display text-[clamp(1.75rem,4vw,2.25rem)] leading-tight text-ink"
              >
                {section.title}
              </h2>
              {section.intro ? (
                <p className="mt-3 max-w-2xl text-ink-muted">{section.intro}</p>
              ) : null}
              <div className="mt-6">
                {section.stories.map((story) => (
                  <Story key={story.url + story.title} story={story} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-line/80 pt-8 text-sm text-ink-muted">
          This page is a curated reading list, not an endorsement of every outlet conclusion.
          Templates remain attorney-review starting points — not legal advice. Suggest a link:{" "}
          <a
            className="font-medium text-teal-deep underline"
            href="mailto:hello@clawql.com?subject=CTF%20media%20page%20suggestion"
          >
            hello@clawql.com
          </a>
          .
        </p>

        <a
          href="/"
          className="mt-8 inline-block text-sm font-semibold text-teal-deep underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
        >
          ← Back to the generator
        </a>
      </main>

      <SiteFooter />
    </div>
  );
}
