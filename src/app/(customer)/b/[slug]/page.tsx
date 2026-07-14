'use client';
import * as React from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Star, Clock, Phone, Loader2, Check, AlertCircle, ArrowRight, User, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { formatPKR } from '@/lib/money';
import { formatAsTyped, digitsOnly, isValidPkMobile } from '@/lib/phone';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Svc { id: string; name: string; duration: number; price: number; policy: string }
interface Grp { id: string; name: string; services: Svc[] }
interface Biz {
  id: string; slug: string; name: string; description: string | null;
  cover_url: string | null; category: string;
  rating_avg: number | null; rating_count: number;
  branch_id: string; phone: string;
  address: string; landmark: string | null; area: string | null; city: string;
  photos: string[];
  hours: { dow: number; opens: string; closes: string; closed: boolean }[];
  menu: Grp[];
  staff: { id: string; name: string; gender: string | null }[];
}
interface SlotGroup { start_at: string; staff: { id: string; name: string }[] }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [b, setB] = React.useState<Biz | null>(null);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [booking, setBooking] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/v1/public/business/${slug}`)
      .then(r => r.json())
      .then(j => setB(j.data));
  }, [slug]);

  if (!b) {
    return <div className="grid min-h-[60vh] place-items-center text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  const all = b.menu.flatMap(g => g.services);
  const total = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.price ?? 0), 0);
  const minutes = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.duration ?? 0), 0);

  const today = new Date().getDay();
  const todayHours = b.hours.find(h => h.dow === today);

  return (
    <>
      {/* ---- cover ---- */}
      <div className="relative h-[280px] bg-soft sm:h-[340px]">
        {b.cover_url && (
          <Image src={b.cover_url} alt="" fill unoptimized className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />

        <div className="container relative flex h-full flex-col justify-end pb-7">
          <span className="mb-2 w-fit rounded bg-white/15 px-2.5 py-1 font-display text-[0.7rem] font-bold uppercase tracking-wide text-white backdrop-blur">
            {b.category}
          </span>
          <h1 className="text-white">{b.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9rem] text-white/85">
            {b.rating_count > 0 ? (
              <span className="tnum inline-flex items-center gap-1.5 font-semibold">
                <Star className="size-4 fill-brand text-brand" />
                {b.rating_avg?.toFixed(1)}
                <span className="font-normal text-white/60">({b.rating_count})</span>
              </span>
            ) : (
              <span className="rounded bg-white px-2 py-0.5 font-display text-[0.62rem] font-bold uppercase tracking-wide text-ink">
                New
              </span>
            )}

            {/* THE LANDMARK. Not the street address. This is the line that
                actually gets her to the door. */}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {b.landmark || `${b.area}, ${b.city}`}
            </span>

            {todayHours && (
              <span className="tnum inline-flex items-center gap-1.5 font-mono">
                <Clock className="size-4" />
                {todayHours.closed
                  ? 'Closed today'
                  : `${todayHours.opens} – ${todayHours.closes}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        {/* ---- menu ---- */}
        <div>
          {b.description && (
            <p className="mb-8 max-w-[62ch] text-[1rem] leading-relaxed text-muted">
              {b.description}
            </p>
          )}

          <h2 className="mb-5 text-[1.5rem]">Services &amp; prices</h2>

          {b.menu.length === 0 ? (
            <div className="rounded-lg border border-line bg-soft p-8 text-center text-[0.92rem] text-muted">
              This business hasn&apos;t added its services yet.
            </div>
          ) : (
            <div className="space-y-5">
              {b.menu.map(g => (
                <div key={g.id} className="overflow-hidden rounded-lg border border-line bg-white">
                  <div className="border-b border-line bg-soft/70 px-5 py-3.5">
                    <h3>{g.name}</h3>
                  </div>
                  <div className="divide-y divide-line">
                    {g.services.map(s => {
                      const on = picked.includes(s.id);
                      const consult = s.policy === 'consultation_only';
                      return (
                        <button key={s.id}
                          onClick={() => !consult && setPicked(p =>
                            p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                          disabled={consult}
                          className={cn(
                            'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors',
                            on ? 'bg-brand-tint2' : 'hover:bg-soft/60',
                            consult && 'cursor-default opacity-70',
                          )}>
                          <span className={cn(
                            'grid size-5 flex-none place-items-center rounded border-2 transition-colors',
                            on ? 'border-brand bg-brand' : 'border-line2',
                            consult && 'invisible',
                          )}>
                            {on && <Check className="size-3 text-white" strokeWidth={4} />}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="font-display text-[0.95rem] font-bold text-ink">
                              {s.name}
                            </p>
                            <p className="tnum mt-0.5 flex items-center gap-2 text-[0.8rem] text-muted">
                              <Clock className="size-3" /> {s.duration} min
                              {consult && (
                                <span className="inline-flex items-center gap-1 rounded bg-brand-tint px-1.5 py-0.5 font-display text-[0.58rem] font-bold uppercase tracking-wide text-brand">
                                  <Info className="size-2.5" /> Call to book
                                </span>
                              )}
                            </p>
                          </div>

                          {/* REAL PRICES. Not "call for price". That is the whole
                              reason a customer would use us instead of Google Maps. */}
                          <span className="tnum flex-none font-mono text-[0.95rem] font-semibold text-ink">
                            {formatPKR(s.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- sticky booking rail ---- */}
        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <div className="rounded-lg border border-line bg-white p-5">
            {picked.length === 0 ? (
              <>
                <h3 className="mb-2">Pick your services</h3>
                <p className="text-[0.88rem] leading-relaxed text-muted">
                  Tap what you want and we&apos;ll show you exactly when they&apos;re free.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-3">Your booking</h3>
                <div className="mb-4 space-y-2">
                  {picked.map(id => {
                    const s = all.find(x => x.id === id)!;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-[0.87rem]">
                        <span className="min-w-0 truncate text-ink">{s.name}</span>
                        <span className="tnum flex-none font-mono text-muted">
                          {formatPKR(s.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="tnum text-[0.85rem] text-muted">{minutes} min</span>
                  <span className="tnum font-display text-[1.15rem] font-extrabold text-ink">
                    {formatPKR(total)}
                  </span>
                </div>

                <Button block size="lg" onClick={() => setBooking(true)}>
                  See times <ArrowRight />
                </Button>

                <p className="mt-3 text-center text-[0.76rem] leading-relaxed text-faint">
                  Booking is free. You pay the salon directly.
                </p>
              </>
            )}
          </div>

          {/* hours + contact */}
          <div className="mt-5 rounded-lg border border-line bg-white p-5">
            <h3 className="mb-3">Opening hours</h3>
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                const h = b.hours.find(x => x.dow === dow);
                const isToday = dow === today;
                return (
                  <div key={dow} className={cn(
                    'flex items-center justify-between text-[0.85rem]',
                    isToday && 'font-semibold text-ink',
                  )}>
                    <span className={isToday ? '' : 'text-muted'}>{DAYS[dow]}</span>
                    <span className={cn('tnum font-mono', h?.closed ? 'text-faint' : 'text-ink')}>
                      {!h || h.closed ? 'Closed' : `${h.opens} – ${h.closes}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <a href={`tel:${b.phone}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-line2 py-2.5 font-display text-[0.88rem] font-bold text-ink transition-colors hover:border-ink">
              <Phone className="size-4" /> Call the salon
            </a>
          </div>
        </aside>
      </div>

      {booking && (
        <BookDialog b={b} serviceIds={picked} total={total} minutes={minutes}
          onClose={() => setBooking(false)} />
      )}
    </>
  );
}

/* ====================================================================== */

function BookDialog({ b, serviceIds, total, minutes, onClose }: {
  b: Biz; serviceIds: string[]; total: number; minutes: number; onClose: () => void;
}) {
  const router = useRouter();

  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = React.useState<SlotGroup[] | null>(null);
  const [slot, setSlot] = React.useState('');
  const [staffId, setStaffId] = React.useState('');
  const [wantStaff, setWantStaff] = React.useState<string | null>(null);  // null = anyone

  const [phone, setPhone] = React.useState('');
  const [needPhone, setNeedPhone] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ reference: string } | null>(null);

  React.useEffect(() => {
    let dead = false;
    setSlots(null); setSlot(''); setStaffId('');

    const p = new URLSearchParams({
      branch_id: b.branch_id,
      service_ids: serviceIds.join(','),
      date,
    });
    if (wantStaff) p.set('staff_id', wantStaff);

    fetch(`/api/v1/public/availability?${p}`)
      .then(r => r.json())
      .then(j => { if (!dead) setSlots(j.data ?? []); });

    return () => { dead = true; };
  }, [b.branch_id, serviceIds, date, wantStaff]);

  const chosen = slots?.find(s => s.start_at === slot);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

  const submit = async () => {
    setError(null);

    const { data } = await auth.getUser();
    if (!data.user) {
      router.push(`/login?next=/b/${b.slug}`);
      return;
    }

    if (!slot || !staffId) { setError('Pick a time.'); return; }

    setBusy(true);

    // Google gave us an email, not a number. Ask for it HERE, where the reason
    // is obvious — not at signup, where it's just a hurdle.
    if (needPhone) {
      if (!isValidPkMobile(phone)) {
        setBusy(false);
        setError('We need a valid mobile number to remind you.');
        return;
      }
      await fetch('/api/v1/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digitsOnly(phone) }),
      });
    }

    const res = await fetch('/api/v1/me/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: b.id,
        branch_id: b.branch_id,
        staff_id: staffId,
        service_ids: serviceIds,
        start_at: slot,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (json.error?.meta?.need === 'phone') { setNeedPhone(true); setError(json.error.title); return; }
      setError(json.error?.title ?? 'Could not book.');
      return;
    }

    setDone({ reference: json.data.reference });
  };

  /* ---- confirmed ---- */
  if (done) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent title="You're booked" className="max-w-[440px]">
          <div className="py-2 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-ok/12 text-ok">
              <Check className="size-7" strokeWidth={3} />
            </div>

            <h2 className="mb-2 text-[1.4rem]">See you soon.</h2>
            <p className="mb-5 text-[0.95rem] leading-relaxed text-muted">
              {new Date(slot).toLocaleDateString('en-GB',
                { weekday: 'long', day: 'numeric', month: 'long' })}
              {' at '}
              <b className="font-display font-bold text-ink">
                {new Date(slot).toLocaleTimeString('en-GB',
                  { hour: '2-digit', minute: '2-digit', hour12: true })}
              </b>
            </p>

            <div className="mb-5 rounded-lg border border-line bg-soft p-4 text-left">
              <p className="font-display text-[1rem] font-bold text-ink">{b.name}</p>
              {/* The landmark, in the confirmation, because this is the moment
                  she'll screenshot and the thing she'll actually navigate by. */}
              {b.landmark && (
                <p className="mt-1 flex items-start gap-1.5 text-[0.87rem] leading-snug text-ink">
                  <MapPin className="mt-0.5 size-3.5 flex-none text-brand" />
                  {b.landmark}
                </p>
              )}
              <p className="tnum mt-2 font-mono text-[0.78rem] text-faint">
                Ref {done.reference}
              </p>
            </div>

            <Button block size="lg" onClick={() => router.push('/bookings')}>
              My bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent title="Pick a time" className="max-w-[520px]">
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">

          {/* who — "Anyone" is the default and gives the most slots */}
          {b.staff.length > 1 && (
            <div>
              <label className="mb-2 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
                Anyone in particular?
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setWantStaff(null)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[0.86rem] transition-all',
                    wantStaff === null
                      ? 'border-brand bg-brand font-semibold text-white'
                      : 'border-line2 bg-white text-ink hover:border-faint',
                  )}>
                  Anyone
                </button>
                {b.staff.map(s => (
                  <button key={s.id} onClick={() => setWantStaff(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[0.86rem] transition-all',
                      wantStaff === s.id
                        ? 'border-brand bg-brand font-semibold text-white'
                        : 'border-line2 bg-white text-ink hover:border-faint',
                    )}>
                    <User className="size-3.5" /> {s.name}
                  </button>
                ))}
              </div>
              {wantStaff && (
                <p className="mt-2 text-[0.78rem] text-faint">
                  Choosing someone specific means fewer times to pick from.
                </p>
              )}
            </div>
          )}

          {/* when */}
          <div>
            <label className="mb-2 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
              Which day?
            </label>
            <div className="-mx-1 mb-3.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {days.map(d => {
                const iso = d.toISOString().slice(0, 10);
                const on = iso === date;
                const isToday = iso === new Date().toISOString().slice(0, 10);
                return (
                  <button key={iso} onClick={() => setDate(iso)}
                    className={cn(
                      'flex-none rounded-sm border px-3.5 py-2 text-center transition-all',
                      on ? 'border-brand bg-brand text-white'
                         : 'border-line2 bg-white text-ink hover:border-faint',
                    )}>
                    <span className="block text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">
                      {isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span className="tnum block font-display text-[1rem] font-bold">
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {slots === null ? (
              <div className="grid place-items-center py-7 text-faint">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              /* Never a dead end. Tell her why, and what to do. */
              <div className="rounded-lg border border-line bg-soft px-4 py-6 text-center">
                <p className="font-display text-[0.95rem] font-bold text-ink">
                  Nothing free that day.
                </p>
                <p className="mx-auto mt-1.5 max-w-[36ch] text-[0.85rem] leading-relaxed text-muted">
                  {wantStaff
                    ? 'Try another day, or pick "Anyone" — that usually opens up more times.'
                    : 'Try another day. Most salons are busiest at the weekend.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map(s => {
                  const on = s.start_at === slot;
                  return (
                    <button key={s.start_at}
                      onClick={() => {
                        setSlot(s.start_at);
                        // If she said "anyone", we assign the first free person.
                        // She doesn't care who; she cares about 4pm.
                        setStaffId(s.staff[0]!.id);
                      }}
                      className={cn(
                        'tnum rounded-sm border py-2.5 font-mono text-[0.85rem] transition-all',
                        on ? 'border-brand bg-brand font-semibold text-white'
                           : 'border-line2 bg-white text-ink hover:border-brand',
                      )}>
                      {new Date(s.start_at).toLocaleTimeString('en-GB',
                        { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {chosen && chosen.staff.length > 1 && !wantStaff && (
            <p className="text-[0.82rem] text-muted">
              You&apos;ll be with{' '}
              <b className="font-display font-bold text-ink">
                {chosen.staff.find(s => s.id === staffId)?.name}
              </b>
              .
            </p>
          )}

          {needPhone && (
            <div>
              <label className="mb-2 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
                Your mobile number
              </label>
              <div className="flex items-center overflow-hidden rounded-sm border border-line2 bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
                <span className="flex-none border-r border-line2 bg-soft px-3.5 py-3 font-mono text-[0.9rem] text-ink">
                  +92
                </span>
                <input
                  autoFocus type="tel" inputMode="numeric" maxLength={12}
                  value={formatAsTyped(phone)} placeholder="300 1234567"
                  onChange={(e) => setPhone(e.target.value)}
                  className="tnum min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 font-mono text-[0.97rem] text-ink placeholder:text-faint focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[0.78rem] text-faint">
                So the salon can remind you. We won&apos;t use it for anything else.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.87rem] leading-relaxed text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-4 flex items-center justify-between rounded-lg bg-soft px-4 py-3">
            <span className="tnum text-[0.9rem] text-muted">{minutes} min</span>
            <span className="tnum font-display text-[1.1rem] font-extrabold text-ink">
              {formatPKR(total)}
            </span>
          </div>

          <div className="flex gap-2.5">
            <Button block size="lg" loading={busy} disabled={!slot}
              onClick={() => void submit()}>
              Confirm booking
            </Button>
            <DialogClose asChild>
              <Button size="lg" variant="secondary">Back</Button>
            </DialogClose>
          </div>

          <p className="mt-3 text-center text-[0.76rem] text-faint">
            Free to book. You pay the salon directly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
