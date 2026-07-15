'use client';
import * as React from 'react';
import { Star, MessageSquareReply, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  name: string;          // "Sana M." — never the full name
  rating: number;
  body: string | null;
  tags: string[] | null;
  staff_name: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Data {
  summary: { avg: number | null; count: number; breakdown: Record<string, number> };
  reviews: Review[];
}

/**
 * REVIEWS on the public profile.
 *
 * Every one of these is from someone who ACTUALLY WENT — the database refuses a
 * review without a completed appointment. That's the whole reason these numbers
 * are worth more than Google's, and it's why we say it out loud at the bottom.
 *
 * NAMES ARE TRUNCATED. "Sana M.", never "Sana Malik". A review page that puts a
 * woman's full name next to the salon she visits is a stalking tool.
 */
export function ReviewsSection({ slug, businessName }: {
  slug: string;
  businessName: string;
}) {
  const [d, setD] = React.useState<Data | null>(null);
  const [all, setAll] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/v1/public/reviews/${slug}`)
      .then(r => r.json())
      .then(j => setD(j.data));
  }, [slug]);

  if (!d) {
    return <div className="grid place-items-center py-12 text-warm-faint">
      <Loader2 className="size-5 animate-spin" />
    </div>;
  }

  const { summary, reviews } = d;

  if (summary.count === 0) {
    return (
      <div className="mt-12">
        <h2 className="mb-5 font-display text-[1.6rem] font-extrabold tracking-tight text-warm-ink">
          Reviews
        </h2>
        <div className="rounded-[18px] border border-warm-line/60 bg-white p-10 text-center">
          <div className="mx-auto mb-3.5 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className="size-5 fill-transparent text-warm-line" strokeWidth={1.5} />
            ))}
          </div>
          <p className="font-display text-[1.05rem] font-bold text-warm-ink">
            No reviews yet.
          </p>
          <p className="mx-auto mt-1.5 max-w-[38ch] text-[0.9rem] leading-relaxed text-warm-muted">
            Be the first. Only people who&apos;ve actually been can review — so what
            you read here is real.
          </p>
        </div>
      </div>
    );
  }

  const shown = all ? reviews : reviews.slice(0, 4);

  return (
    <div className="mt-12">
      <h2 className="mb-5 font-display text-[1.6rem] font-extrabold tracking-tight text-warm-ink">
        Reviews
      </h2>

      {/* summary */}
      <div className="mb-7 grid gap-7 rounded-[18px] border border-warm-line/60 bg-white p-6 sm:grid-cols-[auto_1fr] sm:p-7">
        <div className="text-center sm:text-left">
          <p className="tnum font-display text-[3.2rem] font-extrabold leading-none tracking-tight text-warm-ink">
            {summary.avg?.toFixed(1)}
          </p>
          <div className="mt-2 flex justify-center gap-0.5 sm:justify-start">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={cn(
                'size-4',
                n <= Math.round(summary.avg ?? 0)
                  ? 'fill-brand text-brand'
                  : 'fill-transparent text-warm-line',
              )} strokeWidth={1.5} />
            ))}
          </div>
          <p className="mt-1.5 text-[0.85rem] text-warm-muted">
            {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* breakdown */}
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map(n => {
            const c = summary.breakdown[String(n)] ?? 0;
            const pct = summary.count ? (c / summary.count) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2.5">
                <span className="tnum w-[10px] flex-none font-mono text-[0.78rem] text-warm-muted">
                  {n}
                </span>
                <Star className="size-3 flex-none fill-warm-faint text-warm-faint" />
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-warm-low">
                  <div className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${pct}%` }} />
                </div>
                <span className="tnum w-[24px] flex-none text-right font-mono text-[0.76rem] text-warm-faint">
                  {c}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* list */}
      <div className="space-y-4">
        {shown.map(r => (
          <div key={r.id}
            className="rounded-[18px] border border-warm-line/60 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-warm-mid font-display text-[0.75rem] font-bold text-brand">
                {r.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display text-[0.98rem] font-bold text-warm-ink">
                    {r.name}
                  </p>
                  <span className="tnum font-mono text-[0.76rem] text-warm-faint">
                    {new Date(r.created_at).toLocaleDateString('en-GB',
                      { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div className="mt-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={cn(
                      'size-3.5',
                      n <= r.rating
                        ? 'fill-brand text-brand'
                        : 'fill-transparent text-warm-line',
                    )} strokeWidth={1.5} />
                  ))}
                  {r.staff_name && (
                    <span className="ml-2 text-[0.8rem] text-warm-muted">
                      with {r.staff_name}
                    </span>
                  )}
                </div>

                {r.body && (
                  <p className="mt-2.5 text-[0.92rem] leading-relaxed text-warm-ink">
                    {r.body}
                  </p>
                )}

                {r.tags?.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.tags.map(t => (
                      <span key={t}
                        className="rounded-full bg-warm-low px-2.5 py-1 text-[0.75rem] font-medium text-warm-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* The reply. A one-star with a calm reply beneath it reads
                    better to the next customer than no one-star at all. */}
                {r.reply && (
                  <div className="mt-3.5 rounded-[12px] border-l-[3px] border-l-brand bg-warm-low p-3.5">
                    <p className="mb-1 inline-flex items-center gap-1.5 font-display text-[0.75rem] font-bold text-brand">
                      <MessageSquareReply className="size-3.5" />
                      {businessName} replied
                    </p>
                    <p className="text-[0.88rem] leading-relaxed text-warm-ink">
                      {r.reply}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviews.length > 4 && !all && (
        <button onClick={() => setAll(true)}
          className="mt-5 w-full rounded-full border border-warm-line bg-white py-3.5 font-display text-[0.92rem] font-bold text-warm-ink transition-colors hover:border-brand hover:text-brand">
          Show all {summary.count} reviews
        </button>
      )}

      {/* THE TRUST LINE. This is the whole argument. */}
      <p className="mt-6 rounded-[14px] bg-warm-low p-4 text-center text-[0.84rem] leading-relaxed text-warm-muted">
        <b className="font-display font-bold text-warm-ink">Every review is from a real visit.</b>{' '}
        You can only review an appointment you actually attended — so nobody can
        buy a five-star, and nobody can plant a one-star.
      </p>
    </div>
  );
}
