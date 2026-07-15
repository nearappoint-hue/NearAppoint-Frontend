'use client';
import * as React from 'react';
import {
  Star, MessageSquareReply, Loader2, AlertCircle, Check, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  name: string;
  rating: number;
  body: string | null;
  tags: string[] | null;
  staff_name: string | null;
  services: string[] | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Data {
  stats: { avg: number | null; count: number; reply_rate: number; unanswered: number };
  reviews: Review[];
}

/**
 * REVIEWS — the business view.
 *
 * Full names here, because these are HER customers. On the public page they're
 * truncated to "Sana M." and the phone number is never returned at all.
 *
 * The unanswered ones get an orange left border. Replying to reviews —
 * ESPECIALLY the bad ones — is the cheapest trust she will ever buy: a one-star
 * with a calm, specific reply beneath it reads better to the next customer than
 * no one-star at all.
 */
export default function ReviewsPage() {
  const [d, setD] = React.useState<Data | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/business-reviews');
    const j = await r.json();
    setD(j.data);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (!d) {
    return <div className="grid place-items-center py-24 text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  const { stats, reviews } = d;

  return (
    <div className="w-full">
      <PageHeader
        title="Reviews"
        subtitle="What your customers actually said."
        accent={stats.unanswered > 0
          ? `${stats.unanswered} waiting for a reply`
          : undefined}
      />

      {stats.count === 0 ? (
        <Callout className="py-16 text-center">
          <div className="mx-auto mb-4 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className="size-6 fill-transparent text-line2" strokeWidth={1.5} />
            ))}
          </div>
          <h2 className="mb-2.5 text-[1.3rem]">No reviews yet.</h2>
          <p className="mx-auto max-w-[46ch] text-[0.94rem] leading-relaxed text-muted">
            Once you complete an appointment, we&apos;ll ask that customer how it went.
            Only people who actually came in can review you — so what appears here
            is real, and nobody can plant a bad one.
          </p>
        </Callout>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-line border-l-[3px] border-l-brand bg-white p-5">
              <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
                Rating
              </p>
              <div className="mt-2 flex items-center gap-3">
                <p className="tnum font-display text-[1.9rem] font-extrabold leading-none tracking-tight text-ink">
                  {stats.avg?.toFixed(1)}
                </p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={cn(
                      'size-4',
                      n <= Math.round(stats.avg ?? 0)
                        ? 'fill-brand text-brand'
                        : 'fill-transparent text-line2',
                    )} strokeWidth={1.5} />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-white p-5">
              <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
                Reviews
              </p>
              <p className="tnum mt-2 font-display text-[1.9rem] font-extrabold leading-none tracking-tight text-ink">
                {stats.count}
              </p>
            </div>

            <div className="rounded-lg border border-line bg-white p-5">
              <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
                Reply rate
              </p>
              <p className={cn(
                'tnum mt-2 font-display text-[1.9rem] font-extrabold leading-none tracking-tight',
                stats.reply_rate >= 70 ? 'text-ok' : 'text-ink',
              )}>
                {stats.reply_rate}%
              </p>
            </div>
          </div>

          <Panel>
            {reviews.map(r => (
              <ReviewRow key={r.id} review={r} onDone={load} />
            ))}
          </Panel>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-line bg-soft p-4">
            <Info className="mt-0.5 size-4 flex-none text-faint" />
            <p className="text-[0.86rem] leading-relaxed text-muted">
              <b className="font-display font-bold text-ink">
                Replying to reviews — especially the bad ones — is the cheapest trust
                you&apos;ll ever buy.
              </b>{' '}
              A one-star with a calm, specific reply underneath reads better to the
              next customer than no one-star at all.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewRow({ review, onDone }: {
  review: Review; onDone: () => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [reply, setReply] = React.useState(review.reply ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/v1/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setEditing(false);
    await onDone();
  };

  const needsReply = !review.reply;

  return (
    <div className={cn(
      'p-5',
      // Unanswered gets an orange edge. Across a long list she can see at a
      // glance what's still waiting on her.
      needsReply && 'border-l-[3px] border-l-brand bg-brand-tint2/40',
    )}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-brand-tint font-display text-[0.75rem] font-bold text-brand">
          {review.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-[0.98rem] font-bold text-ink">
              {review.name}
            </p>
            <span className="tnum font-mono text-[0.76rem] text-faint">
              {new Date(review.created_at).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={cn(
                'size-3.5',
                n <= review.rating
                  ? 'fill-brand text-brand'
                  : 'fill-transparent text-line2',
              )} strokeWidth={1.5} />
            ))}
            {review.services?.length ? (
              <span className="ml-2.5 truncate text-[0.8rem] text-muted">
                {review.services.join(', ')}
                {review.staff_name && ` · ${review.staff_name}`}
              </span>
            ) : null}
          </div>

          {review.body && (
            <p className="mt-2.5 text-[0.92rem] leading-relaxed text-ink">
              {review.body}
            </p>
          )}

          {review.tags?.length ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {review.tags.map(t => (
                <span key={t}
                  className="rounded bg-soft px-2 py-0.5 text-[0.74rem] font-medium text-muted">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* reply */}
          {editing ? (
            <div className="mt-4">
              <textarea
                autoFocus
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={review.rating <= 3
                  ? 'Put it right. Be specific, and don\u2019t argue \u2014 the next customer is reading.'
                  : 'Thank them.'}
                className="w-full rounded-sm border border-line2 bg-white p-3 text-[0.9rem] leading-relaxed text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />

              {error && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
                  <AlertCircle className="mt-0.5 size-[14px] flex-none" /> {error}
                </div>
              )}

              <div className="mt-3 flex gap-2.5">
                <Button size="sm" loading={busy} onClick={() => void save()}>
                  Post reply
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => { setEditing(false); setReply(review.reply ?? ''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : review.reply ? (
            <div className="mt-3.5 rounded-sm border-l-[3px] border-l-brand bg-soft p-3.5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 font-display text-[0.72rem] font-bold text-brand">
                  <MessageSquareReply className="size-3.5" /> You replied
                </p>
                <button onClick={() => setEditing(true)}
                  className="text-[0.75rem] font-semibold text-faint transition-colors hover:text-ink">
                  Edit
                </button>
              </div>
              <p className="text-[0.88rem] leading-relaxed text-ink">{review.reply}</p>
            </div>
          ) : null}
        </div>

        {needsReply && !editing && (
          <Button variant="secondary" size="sm" className="flex-none"
            onClick={() => setEditing(true)}>
            <MessageSquareReply className="size-3.5" /> Reply
          </Button>
        )}

        {review.reply && !editing && (
          <span className="flex-none">
            <Tag tone="ok"><Check className="size-3" strokeWidth={3} /> Replied</Tag>
          </span>
        )}
      </div>
    </div>
  );
}
