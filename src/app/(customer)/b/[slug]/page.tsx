'use client';
import * as React from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Star, Clock, Phone, Loader2, Check, AlertCircle, ArrowRight, User, Info,
} from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { CustomerNav } from '@/components/customer/customer-nav';
import { ReviewsSection } from '@/components/customer/reviews-section';
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

/**
 * A booking she started before signing in must SURVIVE the trip to Google.
 *
 * Without this: she picks three services, taps Confirm, gets bounced to Google,
 * comes back — and the page is blank. Everything she chose is gone and she has
 * to do it all again.
 *
 * That is the single most likely moment for someone to give up on the app
 * entirely, and it happens on her FIRST booking, which is the only one that
 * decides whether there's a second.
 *
 * sessionStorage, not localStorage: this should not survive a closed tab. It's
 * an in-flight action, not a saved preference.
 */
const PENDING_KEY = 'na:pending-booking';

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

  /* Came back from signing in? Put her booking back exactly where it was, and
     reopen the time picker — she should land back in the flow, not at the top
     of the page wondering what happened. */
  React.useEffect(() => {
    if (!b) return;

    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as { slug: string; services: string[] };
      sessionStorage.removeItem(PENDING_KEY);

      if (saved.slug !== slug || !saved.services?.length) return;

      // Only restore services this business still offers. A stale selection
      // pointing at a deleted service would fail at the server with a message
      // she can't act on.
      const valid = b.menu.flatMap(g => g.services).map(x => x.id);
      const keep = saved.services.filter(id => valid.includes(id));

      if (keep.length) {
        setPicked(keep);
        setBooking(true);
      }
    } catch { /* corrupt storage. Ignore it and let her start again. */ }
  }, [b, slug]);

  if (!b) {
    return (
      <>
        <CustomerNav />
        <div className="grid min-h-[60vh] place-items-center text-warm-faint">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </>
    );
  }

  const all = b.menu.flatMap(g => g.services);
  const total = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.price ?? 0), 0);
  const minutes = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.duration ?? 0), 0);

  const today = new Date().getDay();
  const th = b.hours.find(h => h.dow === today);

  return (
    <>
      <CustomerNav />

      {/* ---- cover ---- */}
      <div className="relative h-[300px] bg-warm-low sm:h-[380px]">
        <Image
          src={b.cover_url ?? '/images/placeholder-cover.webp'}
          alt=""
          fill
          unoptimized={!!b.cover_url}
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#251913]/80 via-[#251913]/25 to-transparent" />

        <div className="container relative flex h-full flex-col justify-end pb-8">
          <span className="mb-3 w-fit rounded-full bg-white/20 px-3 py-1 font-display text-[0.7rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {b.category}
          </span>

          <h1 className="font-display text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-tight tracking-[-0.03em] text-white">
            {b.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[0.92rem] text-white/85">
            {b.rating_count > 0 ? (
              <span className="tnum inline-flex items-center gap-1.5 font-semibold">
                <Star className="size-4 fill-brand text-brand" />
                {b.rating_avg?.toFixed(1)}
                <span className="font-normal text-white/60">({b.rating_count})</span>
              </span>
            ) : (
              <span className="rounded-full bg-white px-2.5 py-0.5 font-display text-[0.62rem] font-bold uppercase tracking-wide text-warm-ink">
                New
              </span>
            )}

            {/* THE LANDMARK. This is the line that actually gets her to the door. */}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 flex-none" />
              {b.landmark || `${b.area}, ${b.city}`}
            </span>

            {th && (
              <span className="tnum inline-flex items-center gap-1.5 font-mono">
                <Clock className="size-4" />
                {th.closed ? 'Closed today' : `${th.opens} – ${th.closes}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container grid gap-9 py-12 lg:grid-cols-[1fr_340px]">
        {/* ---- menu ---- */}
        <div>
          {b.description && (
            <p className="mb-9 max-w-[62ch] text-[1.02rem] leading-relaxed text-warm-muted">
              {b.description}
            </p>
          )}

          <h2 className="mb-6 font-display text-[1.6rem] font-extrabold tracking-tight text-warm-ink">
            Services &amp; prices
          </h2>

          {b.menu.length === 0 ? (
            <div className="rounded-[18px] border border-warm-line/60 bg-white p-10 text-center text-[0.95rem] text-warm-muted">
              This salon hasn&apos;t added its services yet.
            </div>
          ) : (
            <div className="space-y-5">
              {b.menu.map(g => (
                <div key={g.id}
                  className="overflow-hidden rounded-[18px] border border-warm-line/60 bg-white">
                  <div className="border-b border-warm-line/50 bg-warm-low px-6 py-4">
                    <h3 className="font-display text-[1.05rem] font-bold tracking-tight text-warm-ink">
                      {g.name}
                    </h3>
                  </div>

                  <div className="divide-y divide-warm-line/40">
                    {g.services.map(s => {
                      const on = picked.includes(s.id);
                      const consult = s.policy === 'consultation_only';
                      return (
                        <button key={s.id}
                          onClick={() => !consult && setPicked(p =>
                            p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                          disabled={consult}
                          className={cn(
                            'flex w-full items-center gap-4 px-6 py-4 text-left transition-colors',
                            on ? 'bg-warm-low' : 'hover:bg-warm/60',
                            consult && 'cursor-default opacity-65',
                          )}>
                          <span className={cn(
                            'grid size-[22px] flex-none place-items-center rounded-md border-2 transition-all',
                            on ? 'border-brand bg-brand' : 'border-warm-line',
                            consult && 'invisible',
                          )}>
                            {on && <Check className="size-3 text-white" strokeWidth={4} />}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="font-display text-[1rem] font-bold text-warm-ink">
                              {s.name}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-2.5 text-[0.84rem] text-warm-muted">
                              <span className="tnum inline-flex items-center gap-1.5">
                                <Clock className="size-3.5" /> {s.duration} min
                              </span>
                              {consult && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-warm-low px-2 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-brand">
                                  <Info className="size-2.5" /> Call to book
                                </span>
                              )}
                            </p>
                          </div>

                          {/* REAL PRICES. Not "call for price" — which is exactly
                              what our competitors say, and the thing we exist to fix. */}
                          <span className="tnum flex-none font-mono text-[1rem] font-semibold text-warm-ink">
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

          {/* Reviews. Every one from someone who actually went — the database
              refuses a review without a completed appointment. */}
          <ReviewsSection slug={b.slug} businessName={b.name} />
        </div>

        {/* ---- sticky rail ---- */}
        <aside className="lg:sticky lg:top-[96px] lg:h-fit">
          <div className="rounded-[18px] border border-warm-line/60 bg-white p-6 shadow-[0_4px_20px_rgba(88,66,55,.06)]">
            {picked.length === 0 ? (
              <>
                <h3 className="mb-2 font-display text-[1.1rem] font-bold text-warm-ink">
                  Pick your services
                </h3>
                <p className="text-[0.9rem] leading-relaxed text-warm-muted">
                  Tap what you want and we&apos;ll show you exactly when they&apos;re free.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-4 font-display text-[1.1rem] font-bold text-warm-ink">
                  Your booking
                </h3>

                <div className="mb-4 space-y-2.5">
                  {picked.map(id => {
                    const s = all.find(x => x.id === id)!;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-[0.9rem]">
                        <span className="min-w-0 truncate text-warm-ink">{s.name}</span>
                        <span className="tnum flex-none font-mono text-warm-muted">
                          {formatPKR(s.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-5 flex items-center justify-between border-t border-warm-line/50 pt-4">
                  <span className="tnum text-[0.88rem] text-warm-muted">{minutes} min</span>
                  <span className="tnum font-display text-[1.3rem] font-extrabold text-warm-ink">
                    {formatPKR(total)}
                  </span>
                </div>

                <button onClick={() => setBooking(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-display text-[1rem] font-bold text-white shadow-brand transition-all hover:bg-brand-hover active:translate-y-px">
                  See times <ArrowRight className="size-4" />
                </button>

                <p className="mt-3.5 text-center text-[0.78rem] leading-relaxed text-warm-faint">
                  Booking is free. You pay the salon directly.
                </p>
              </>
            )}
          </div>

          {/* hours */}
          <div className="mt-5 rounded-[18px] border border-warm-line/60 bg-white p-6">
            <h3 className="mb-4 font-display text-[1.05rem] font-bold text-warm-ink">
              Opening hours
            </h3>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                const h = b.hours.find(x => x.dow === dow);
                const isToday = dow === today;
                return (
                  <div key={dow} className={cn(
                    'flex items-center justify-between text-[0.88rem]',
                    isToday && 'font-semibold',
                  )}>
                    <span className={isToday ? 'text-warm-ink' : 'text-warm-muted'}>
                      {DAYS[dow]}
                    </span>
                    <span className={cn(
                      'tnum font-mono',
                      h?.closed ? 'text-warm-faint' : 'text-warm-ink',
                    )}>
                      {!h || h.closed ? 'Closed' : `${h.opens} – ${h.closes}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <a href={`tel:${b.phone}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-full border border-warm-line py-3 font-display text-[0.9rem] font-bold text-warm-ink transition-colors hover:border-warm-faint">
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
  const [wantStaff, setWantStaff] = React.useState<string | null>(null);   // null = anyone

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
      // Save what she's chosen BEFORE we send her away. She gets it all back.
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({
          slug: b.slug,
          services: serviceIds,
        }));
      } catch { /* private mode. She'll just have to re-pick. */ }

      router.push(`/login?next=${encodeURIComponent(`/b/${b.slug}`)}`);
      return;
    }

    if (!slot || !staffId) { setError('Pick a time.'); return; }

    setBusy(true);

    /* Google gives us an email, not a number. We ask for it HERE, where the
       reason is obvious — "so the salon can remind you" — instead of at signup,
       where it's just a hurdle in front of the door. */
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
      if (json.error?.meta?.need === 'phone') {
        setNeedPhone(true);
        setError(json.error.title);
        return;
      }
      setError(json.error?.title ?? 'Could not book.');
      return;
    }

    setDone({ reference: json.data.reference });
  };

  /* ---------------- CONFIRMED ---------------- */
  if (done) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent title="" className="max-w-[460px] border-warm-line/60 bg-white">
          <div className="-mt-4 py-2 text-center">
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-ok/10 text-ok">
              <Check className="size-8" strokeWidth={3} />
            </div>

            <h2 className="mb-2.5 font-display text-[1.7rem] font-extrabold tracking-tight text-warm-ink">
              See you soon.
            </h2>

            <p className="mb-6 text-[1rem] leading-relaxed text-warm-muted">
              {new Date(slot).toLocaleDateString('en-GB',
                { weekday: 'long', day: 'numeric', month: 'long' })}
              {' at '}
              <b className="font-display font-bold text-warm-ink">
                {new Date(slot).toLocaleTimeString('en-GB',
                  { hour: '2-digit', minute: '2-digit', hour12: true })}
              </b>
            </p>

            <div className="mb-6 rounded-[14px] border border-warm-line/60 bg-warm-low p-5 text-left">
              <p className="font-display text-[1.05rem] font-bold text-warm-ink">{b.name}</p>

              {/* The landmark, in the confirmation, because this is the screen
                  she'll screenshot and the thing she'll actually navigate by. */}
              {b.landmark && (
                <p className="mt-2 flex items-start gap-1.5 text-[0.9rem] leading-snug text-warm-ink">
                  <MapPin className="mt-0.5 size-3.5 flex-none text-brand" />
                  {b.landmark}
                </p>
              )}

              <p className="tnum mt-3 font-mono text-[0.8rem] text-warm-faint">
                Ref {done.reference}
              </p>
            </div>

            <button onClick={() => router.push('/bookings')}
              className="w-full rounded-full bg-brand py-4 font-display text-[1rem] font-bold text-white shadow-brand transition-colors hover:bg-brand-hover">
              My bookings
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ---------------- PICK A TIME ---------------- */
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent title="Pick a time" className="max-w-[540px] border-warm-line/60">
        <div className="max-h-[58vh] space-y-6 overflow-y-auto pr-1">

          {b.staff.length > 1 && (
            <div>
              <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-warm-faint">
                Anyone in particular?
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setWantStaff(null)}
                  className={cn(
                    'rounded-full border px-4 py-2.5 text-[0.88rem] transition-all',
                    wantStaff === null
                      ? 'border-brand bg-brand font-semibold text-white'
                      : 'border-warm-line bg-white text-warm-ink hover:border-brand',
                  )}>
                  Anyone
                </button>
                {b.staff.map(s => (
                  <button key={s.id} onClick={() => setWantStaff(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[0.88rem] transition-all',
                      wantStaff === s.id
                        ? 'border-brand bg-brand font-semibold text-white'
                        : 'border-warm-line bg-white text-warm-ink hover:border-brand',
                    )}>
                    <User className="size-3.5" /> {s.name}
                  </button>
                ))}
              </div>
              {wantStaff && (
                <p className="mt-2 text-[0.79rem] text-warm-faint">
                  Choosing someone specific means fewer times to pick from.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-warm-faint">
              Which day?
            </label>

            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map(d => {
                const iso = d.toISOString().slice(0, 10);
                const on = iso === date;
                const isToday = iso === new Date().toISOString().slice(0, 10);
                return (
                  <button key={iso} onClick={() => setDate(iso)}
                    className={cn(
                      'flex-none rounded-[14px] border px-4 py-2.5 text-center transition-all',
                      on ? 'border-brand bg-brand text-white'
                         : 'border-warm-line bg-white text-warm-ink hover:border-brand',
                    )}>
                    <span className="block text-[0.62rem] font-bold uppercase tracking-wide opacity-70">
                      {isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span className="tnum mt-0.5 block font-display text-[1.1rem] font-extrabold leading-none">
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {slots === null ? (
              <div className="grid place-items-center py-8 text-warm-faint">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              /* Never a dead end. Tell her WHY, and what to do about it. */
              <div className="rounded-[14px] border border-warm-line/60 bg-warm-low px-5 py-7 text-center">
                <p className="font-display text-[1rem] font-bold text-warm-ink">
                  Nothing free that day.
                </p>
                <p className="mx-auto mt-1.5 max-w-[36ch] text-[0.88rem] leading-relaxed text-warm-muted">
                  {wantStaff
                    ? 'Try another day, or pick "Anyone" \u2014 that usually opens up more times.'
                    : 'Try another day. Salons are busiest at the weekend.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(s => {
                  const on = s.start_at === slot;
                  return (
                    <button key={s.start_at}
                      onClick={() => {
                        setSlot(s.start_at);
                        // She said "anyone" — we give her the first free person.
                        // She doesn't care who; she cares about 4pm.
                        setStaffId(s.staff[0]!.id);
                      }}
                      className={cn(
                        'tnum rounded-[12px] border py-3 font-mono text-[0.88rem] transition-all',
                        on ? 'border-brand bg-brand font-semibold text-white'
                           : 'border-warm-line bg-white text-warm-ink hover:border-brand',
                      )}>
                      {new Date(s.start_at).toLocaleTimeString('en-GB',
                        { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {chosen && chosen.staff.length > 0 && !wantStaff && (
            <p className="text-[0.88rem] text-warm-muted">
              You&apos;ll be with{' '}
              <b className="font-display font-bold text-warm-ink">
                {chosen.staff.find(s => s.id === staffId)?.name}
              </b>
              .
            </p>
          )}

          {needPhone && (
            <div>
              <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-warm-faint">
                Your mobile number
              </label>
              <div className="flex items-center overflow-hidden rounded-full border border-warm-line bg-white focus-within:border-brand">
                <span className="flex-none border-r border-warm-line bg-warm-low px-4 py-3.5 font-mono text-[0.92rem] text-warm-ink">
                  +92
                </span>
                <input
                  autoFocus type="tel" inputMode="numeric" maxLength={12}
                  value={formatAsTyped(phone)} placeholder="300 1234567"
                  onChange={(e) => setPhone(e.target.value)}
                  className="tnum min-w-0 flex-1 border-0 bg-transparent px-4 py-3.5 font-mono text-[1rem] text-warm-ink placeholder:text-warm-faint focus:outline-none"
                />
              </div>
              <p className="mt-2 text-[0.79rem] text-warm-faint">
                So the salon can remind you. We won&apos;t use it for anything else.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3.5 text-[0.88rem] leading-relaxed text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-warm-line/50 pt-5">
          <div className="mb-4 flex items-center justify-between rounded-[14px] bg-warm-low px-5 py-3.5">
            <span className="tnum inline-flex items-center gap-2 font-mono text-[0.95rem] text-warm-ink">
              <Clock className="size-4 text-brand" /> {minutes} min
            </span>
            <span className="tnum font-display text-[1.25rem] font-extrabold text-warm-ink">
              {formatPKR(total)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              disabled={!slot || busy}
              onClick={() => void submit()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand py-4 font-display text-[1rem] font-bold text-white shadow-brand transition-all hover:bg-brand-hover active:translate-y-px disabled:opacity-45 disabled:shadow-none">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Confirm booking
            </button>
            <DialogClose asChild>
              <button className="rounded-full border border-warm-line bg-white px-7 py-4 font-display text-[1rem] font-bold text-warm-ink transition-colors hover:border-warm-faint">
                Back
              </button>
            </DialogClose>
          </div>

          <p className="mt-3.5 text-center text-[0.78rem] text-warm-faint">
            Free to book. You pay the salon directly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
