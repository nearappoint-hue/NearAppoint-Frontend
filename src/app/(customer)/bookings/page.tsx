'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Clock, Loader2, Phone, Navigation, X, Check,
} from 'lucide-react';
import { formatPKR } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Booking {
  id: string; reference: string; status: string;
  start_at: string; end_at: string; total: number;
  business: {
    name: string; slug: string; phone: string;
    address: string; landmark: string | null; area: string | null;
    lat: number; lng: number;
  };
  services: string[];
  staff: string | null;
  can_cancel: boolean;
}

export default function MyBookings() {
  const [rows, setRows] = React.useState<Booking[] | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/me/bookings');
    const j = await r.json();
    setRows(j.data ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (rows === null) {
    return <div className="grid min-h-[50vh] place-items-center text-warm-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  const now = Date.now();
  const upcoming = rows.filter(b =>
    new Date(b.start_at).getTime() > now &&
    !b.status.startsWith('cancelled') && b.status !== 'no_show');
  const past = rows.filter(b => !upcoming.includes(b));

  return (
    <div className="container py-14 lg:py-16">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-low px-3.5 py-1.5 font-display text-[0.78rem] font-bold text-brand">
        Your bookings
      </span>

      <h1 className="my-5 font-display text-[clamp(2rem,4vw,2.6rem)] font-extrabold tracking-[-0.03em] text-warm-ink">
        Upcoming
      </h1>

      {upcoming.length === 0 ? (
        <div className="mb-16 rounded-[20px] border border-warm-line/60 bg-white p-14 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-warm-low text-brand">
            <Calendar className="size-6" />
          </div>

          <h2 className="mb-2.5 font-display text-[1.5rem] font-extrabold tracking-tight text-warm-ink">
            Nothing booked.
          </h2>

          <p className="mx-auto mb-7 max-w-[38ch] text-[0.98rem] leading-relaxed text-warm-muted">
            {past.length > 0
              ? 'Book again with somewhere you\u2019ve been, or find somewhere new.'
              : 'Find a salon near you and book in about a minute.'}
          </p>

          <Link href="/home"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 font-display text-[1rem] font-bold text-white shadow-brand transition-colors hover:bg-brand-hover">
            Find a salon
          </Link>
        </div>
      ) : (
        <div className="mb-16 space-y-5">
          {upcoming.map(b => <Card key={b.id} b={b} onDone={load} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-6 font-display text-[1.5rem] font-extrabold tracking-tight text-warm-ink">
            Past
          </h2>
          <div className="space-y-5">
            {past.map(b => <Card key={b.id} b={b} onDone={load} past />)}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ b, onDone, past }: {
  b: Booking; onDone: () => Promise<void>; past?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const cancel = async () => {
    setBusy(true);
    await fetch(`/api/v1/me/bookings/${b.id}`, { method: 'DELETE' });
    setBusy(false);
    setConfirming(false);
    await onDone();
  };

  const d = new Date(b.start_at);
  const cancelled = b.status.startsWith('cancelled');
  const completed = b.status === 'completed';

  return (
    <div className={cn(
      'overflow-hidden rounded-[18px] border bg-white transition-shadow',
      past ? 'border-warm-line/40 opacity-75'
           : 'border-warm-line/60 hover:shadow-[0_8px_28px_rgba(88,66,55,.08)]',
    )}>
      <div className="flex flex-wrap gap-6 p-6">
        {/* WHEN — the big orange date block from the design */}
        <div className={cn(
          'flex w-[84px] flex-none flex-col items-center justify-center rounded-[14px] py-4',
          past ? 'bg-warm-low' : 'bg-warm-mid',
        )}>
          <span className={cn(
            'font-display text-[0.68rem] font-bold uppercase tracking-wider',
            past ? 'text-warm-faint' : 'text-brand',
          )}>
            {d.toLocaleDateString('en-GB', { month: 'short' })}
          </span>
          <span className={cn(
            'tnum font-display text-[1.85rem] font-extrabold leading-none',
            past ? 'text-warm-muted' : 'text-warm-ink',
          )}>
            {d.getDate()}
          </span>
          <span className="tnum mt-1.5 font-mono text-[0.75rem] text-warm-muted">
            {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        {/* WHAT */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Link href={`/b/${b.business.slug}`}
              className="font-display text-[1.1rem] font-bold text-warm-ink transition-colors hover:text-brand">
              {b.business.name}
            </Link>

            {cancelled && (
              <span className="rounded-full bg-warm-low px-2.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-warm-muted">
                Cancelled
              </span>
            )}
            {completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-ok">
                <Check className="size-2.5" strokeWidth={3} /> Done
              </span>
            )}
          </div>

          <p className="mb-2.5 text-[0.9rem] text-warm-muted">
            {b.services.join(', ')}
            {b.staff && <span> · with {b.staff}</span>}
          </p>

          {/* Landmark, not street address. This is what she navigates by. */}
          {b.business.landmark && (
            <p className="flex items-start gap-1.5 text-[0.88rem] leading-snug text-warm-ink">
              <MapPin className="mt-0.5 size-3.5 flex-none text-brand" />
              {b.business.landmark}
            </p>
          )}

          <p className="tnum mt-2.5 font-mono text-[0.76rem] text-warm-faint">
            Ref {b.reference}
          </p>
        </div>

        {/* MONEY + ACTIONS */}
        <div className="flex flex-none flex-col items-end justify-between gap-4">
          <span className="tnum font-display text-[1.2rem] font-extrabold text-warm-ink">
            {formatPKR(b.total)}
          </span>

          {!past && !cancelled && (
            <div className="flex gap-2">
              <a href={`https://maps.google.com/?q=${b.business.lat},${b.business.lng}`}
                target="_blank" rel="noreferrer" aria-label="Directions"
                className="grid size-10 place-items-center rounded-full border border-warm-line text-warm-muted transition-colors hover:border-brand hover:text-brand">
                <Navigation className="size-4" />
              </a>
              <a href={`tel:${b.business.phone}`} aria-label="Call"
                className="grid size-10 place-items-center rounded-full border border-warm-line text-warm-muted transition-colors hover:border-brand hover:text-brand">
                <Phone className="size-4" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation. The CONSEQUENCE is stated before she confirms, never
          after. Nobody should discover a rule by breaking it. */}
      {!past && !cancelled && (
        <div className="border-t border-warm-line/40 bg-warm/70 px-6 py-3.5">
          {confirming ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.88rem] text-warm-ink">
                Cancel this booking? The salon will be told.
              </p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => void cancel()}
                  className="rounded-full bg-bad px-4 py-2 font-display text-[0.82rem] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Cancelling…' : 'Yes, cancel'}
                </button>
                <button onClick={() => setConfirming(false)}
                  className="rounded-full border border-warm-line bg-white px-4 py-2 font-display text-[0.82rem] font-bold text-warm-ink">
                  Keep it
                </button>
              </div>
            </div>
          ) : b.can_cancel ? (
            <button onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 text-[0.86rem] font-semibold text-warm-muted transition-colors hover:text-bad">
              <X className="size-3.5" /> Cancel booking
            </button>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[0.84rem] text-warm-faint">
              <Clock className="size-3.5" />
              Too late to cancel online — please call the salon.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
