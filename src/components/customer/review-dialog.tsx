'use client';
import * as React from 'react';
import Image from 'next/image';
import { Star, Loader2, AlertCircle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Pending {
  appointment_id: string;
  business_name: string;
  business_slug: string;
  cover_url: string | null;
  completed_at: string;
  services: string[];
  staff_name: string | null;
}

const TAGS = ['On time', 'Friendly', 'Clean & tidy', 'Great value', 'Would come back'];

const LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

/**
 * LEAVE A REVIEW.
 *
 * ⚠️  She can only reach this because she ACTUALLY WENT. The database refuses a
 * review without a completed appointment — a rival cannot leave a one-star and a
 * friend cannot leave a five-star.
 *
 * That constraint is why these numbers are worth more than Google's, and it's
 * the only thing a customer needs to know about our reviews.
 *
 * The TAGS are the important bit. A 4-star with no words tells the next customer
 * nothing. "On time · Friendly" takes two taps and tells her everything.
 */
export function ReviewDialog({ pending, onDone, onSkip }: {
  pending: Pending;
  onDone: () => Promise<void>;
  onSkip: () => void;
}) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [tags, setTags] = React.useState<string[]>([]);
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const shown = hover || rating;

  const toggle = (t: string) =>
    setTags(x => x.includes(t) ? x.filter(y => y !== t) : [...x, t]);

  const submit = async () => {
    if (!rating) { setError('Pick a rating first.'); return; }

    setBusy(true);
    setError(null);

    const res = await fetch('/api/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: pending.appointment_id,
        rating,
        body: body || null,
        tags,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not post your review.'); return; }

    setDone(true);
    setTimeout(() => void onDone(), 1400);
  };

  if (done) {
    return (
      <Dialog open onOpenChange={onSkip}>
        <DialogContent title="" className="max-w-[400px]">
          <div className="-mt-4 py-6 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-ok/10 text-ok">
              <Check className="size-7" strokeWidth={3} />
            </div>
            <h2 className="mb-2 font-display text-[1.4rem] font-extrabold tracking-tight text-warm-ink">
              Thank you.
            </h2>
            <p className="text-[0.95rem] leading-relaxed text-warm-muted">
              That&apos;s the only thing that helps the next person choose well.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onSkip}>
      <DialogContent title="How was it?" className="max-w-[480px]">
        <div className="max-h-[62vh] space-y-5 overflow-y-auto pr-1">

          {/* what she's reviewing */}
          <div className="flex items-center gap-3.5 rounded-[14px] bg-warm-low p-4">
            <div className="relative size-12 flex-none overflow-hidden rounded-lg bg-warm-mid">
              <Image
                src={pending.cover_url ?? '/images/placeholder-cover.webp'}
                alt="" fill unoptimized={!!pending.cover_url}
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[1rem] font-bold text-warm-ink">
                {pending.business_name}
              </p>
              <p className="truncate text-[0.85rem] text-warm-muted">
                {pending.services.join(', ')}
                {pending.staff_name && <span> · with {pending.staff_name}</span>}
              </p>
              <p className="tnum mt-0.5 font-mono text-[0.75rem] text-warm-faint">
                {new Date(pending.completed_at).toLocaleDateString('en-GB',
                  { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* stars */}
          <div className="text-center">
            <div className="flex justify-center gap-1.5"
              onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setRating(n); setError(null); }}
                  onMouseEnter={() => setHover(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star className={cn(
                    'size-9 transition-colors',
                    n <= shown
                      ? 'fill-brand text-brand'
                      : 'fill-transparent text-warm-line',
                  )} strokeWidth={1.5} />
                </button>
              ))}
            </div>

            <p className={cn(
              'mt-2 font-display text-[1.05rem] font-bold transition-colors',
              shown ? 'text-warm-ink' : 'text-warm-faint',
            )}>
              {LABELS[shown] || 'Tap a star'}
            </p>
          </div>

          {/* tags — cheap to give, enormously useful to the next customer */}
          {rating > 0 && (
            <div>
              <p className="mb-2.5 text-center text-[0.84rem] text-warm-muted">
                What stood out?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {TAGS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={cn(
                      'rounded-full border px-3.5 py-2 text-[0.84rem] transition-all',
                      tags.includes(t)
                        ? 'border-brand bg-brand font-semibold text-white'
                        : 'border-warm-line bg-white text-warm-ink hover:border-brand',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rating > 0 && (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Anything you'd like to add? (optional)"
              className="w-full rounded-[14px] border border-warm-line bg-white p-3.5 text-[0.92rem] leading-relaxed text-warm-ink placeholder:text-warm-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/12"
            />
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-[0.87rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}

          {/* The promise. She should never wonder what happens to her number. */}
          <p className="text-center text-[0.78rem] leading-relaxed text-warm-faint">
            Your review is public. Your phone number never is.
          </p>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-warm-line/50 pt-5">
          <button
            disabled={!rating || busy}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-display text-[1rem] font-bold text-white shadow-brand transition-all hover:bg-brand-hover active:translate-y-px disabled:opacity-45 disabled:shadow-none"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Post review
          </button>

          <DialogClose asChild>
            <button className="w-full py-2.5 font-display text-[0.9rem] font-semibold text-warm-muted transition-colors hover:text-warm-ink">
              Not now
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
