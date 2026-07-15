import * as React from 'react';

/**
 * The shell every legal document renders into — Privacy, Terms, Cookies,
 * Refunds. One layout, one type treatment, one place to restyle all four.
 *
 * Server component. No client JS: the table of contents is plain anchor links,
 * and `scroll-mt-24` offsets them under the sticky nav. Legal pages are read,
 * not interacted with — shipping them as static HTML is the correct call for
 * both speed and search.
 */
export type LegalSection = { id: string; title: string; body: React.ReactNode };

export function LegalPage({
  title,
  updated,
  lede,
  sections,
}: {
  title: string;
  updated: string;
  lede: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <header className="border-b border-line bg-brand-tint2">
        <div className="container py-14 md:py-16">
          <p className="mb-3 font-display text-[0.74rem] font-bold uppercase tracking-[0.14em] text-brand">
            Legal
          </p>
          <h1 className="text-[clamp(2rem,4vw,2.9rem)]">{title}</h1>
          <p className="mt-3 font-mono text-[0.82rem] text-faint">Last updated: {updated}</p>
          <p className="mt-5 max-w-[62ch] text-[1.02rem] leading-relaxed text-muted">{lede}</p>
        </div>
      </header>

      <div className="container grid gap-12 py-14 lg:grid-cols-[210px_1fr] lg:gap-16">
        {/* Table of contents — sticky on desktop, hidden on mobile. */}
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-faint">
              On this page
            </p>
            <ul className="space-y-2.5 border-l border-line">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l-2 border-transparent pl-3.5 text-[0.86rem] leading-snug text-muted transition-colors hover:border-brand hover:text-ink"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="max-w-[68ch]">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 [&:not(:first-child)]:mt-11">
              <h2 className="flex items-baseline gap-3 text-[1.35rem] leading-tight">
                <span className="font-mono text-[0.8rem] font-medium text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </h2>
              <div
                className="mt-4 space-y-4 text-[0.95rem] leading-relaxed text-muted
                  [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline
                  [&_strong]:font-semibold [&_strong]:text-ink
                  [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:font-display [&_h3]:text-[1rem] [&_h3]:font-bold [&_h3]:text-ink
                  [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:marker:text-brand
                  [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:list-decimal"
              >
                {s.body}
              </div>
            </section>
          ))}

          <p className="mt-12 rounded border border-line bg-soft px-5 py-4 text-[0.88rem] leading-relaxed text-muted">
            Questions about this policy? Email us at{' '}
            <a href="mailto:hello@nearappoint.com" className="font-medium text-brand hover:underline">
              hello@nearappoint.com
            </a>{' '}
            — a real person in Lahore reads it.
          </p>
        </article>
      </div>
    </>
  );
}
