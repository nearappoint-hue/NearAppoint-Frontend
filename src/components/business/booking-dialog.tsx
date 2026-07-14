'use client';
import * as React from 'react';
import { CalendarPlus, AlertCircle, Check, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { formatAsTyped, digitsOnly, isValidPkMobile } from '@/lib/phone';
import { formatPKR } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Service { id: string; name: string; duration_minutes: number; price: number | null }
interface Group   { id: string; name: string; services: Service[] }
interface Staff   { id: string; full_name: string; service_ids: string[]; is_bookable: boolean }
interface SlotGroup { start_at: string; staff: { id: string; name: string }[] }

/**
 * BOOK AHEAD.
 *
 * "Come back Thursday at 4."
 *
 * Without this she is running on our product PLUS a paper diary — which means
 * her calendar is only half true, and a half-true calendar is worthless to the
 * customer side we're going to build on top of it.
 *
 * The slots come from the server. We do NOT compute availability in the
 * browser: it would need her hours, her overrides, her breaks, her leave and
 * every existing booking, and any drift between what we show and what the
 * database allows produces a booking that fails after she's promised it.
 */
export function BookingDialog({ groups, staff, onDone, trigger }: {
  groups: Group[]; staff: Staff[]; onDone: () => Promise<void>; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : <Button variant="secondary" onClick={() => setOpen(true)}>
            <CalendarPlus /> Book ahead
          </Button>}
      {open && (
        <BookingForm groups={groups} staff={staff}
          onDone={async () => { setOpen(false); await onDone(); }} />
      )}
    </Dialog>
  );
}

function BookingForm({ groups, staff, onDone }: {
  groups: Group[]; staff: Staff[]; onDone: () => Promise<void>;
}) {
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [known, setKnown] = React.useState<{ full_name: string | null; total_visits: number; notes: string | null } | null>(null);

  const [picked, setPicked] = React.useState<string[]>([]);
  const [date, setDate] = React.useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = React.useState<SlotGroup[] | null>(null);
  const [slot, setSlot] = React.useState<string>('');
  const [staffId, setStaffId] = React.useState('');

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const all = React.useMemo(() => groups.flatMap(g => g.services), [groups]);

  /* ---- lookup ---- */
  React.useEffect(() => {
    if (!isValidPkMobile(phone)) { setKnown(null); return; }
    let dead = false;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/v1/customers/lookup?phone=${digitsOnly(phone)}`);
      const j = await r.json();
      if (dead) return;
      setKnown(j.data ?? null);
      if (j.data?.full_name && !name) setName(j.data.full_name);
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [phone]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- availability. Recompute whenever services or the date change. ---- */
  React.useEffect(() => {
    if (!picked.length) { setSlots(null); return; }

    let dead = false;
    setSlots(null);
    setSlot('');
    setStaffId('');

    (async () => {
      const r = await fetch(
        `/api/v1/availability?date=${date}&service_ids=${picked.join(',')}`);
      const j = await r.json();
      if (!dead) setSlots(j.data ?? []);
    })();

    return () => { dead = true; };
  }, [picked, date]);

  const toggle = (id: string) => {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setError(null);
  };

  const chosen = slots?.find(s => s.start_at === slot);

  const minutes = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.duration_minutes ?? 0), 0);
  const total   = picked.reduce((n, id) => n + (all.find(s => s.id === id)?.price ?? 0), 0);

  // 14 days forward. Beyond that she's guessing, and so is the customer.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const submit = async () => {
    setError(null);
    if (!isValidPkMobile(phone)) {
      setError('A future booking needs a phone number \u2014 otherwise you can\u2019t remind them.');
      return;
    }
    if (!picked.length) { setError('Pick at least one service.'); return; }
    if (!slot)          { setError('Pick a time.'); return; }
    if (!staffId)       { setError('Pick who will do it.'); return; }

    setBusy(true);
    const res = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        service_ids: picked,
        phone: digitsOnly(phone),
        full_name: name || null,
        start_at: slot,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not create the booking.'); return; }
    await onDone();
  };

  return (
    <DialogContent title="New booking" className="max-w-[560px]">
      <div className="max-h-[64vh] space-y-5 overflow-y-auto pr-1">

        {/* ---- phone ---- */}
        <div>
          <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
            Customer phone
          </label>
          <div className="flex items-center overflow-hidden rounded-sm border border-line2 bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
            <span className="flex-none border-r border-line2 bg-soft px-3.5 py-3 font-mono text-[0.9rem] text-ink">
              +92
            </span>
            <input
              autoFocus type="tel" inputMode="numeric" maxLength={12}
              value={formatAsTyped(phone)} placeholder="300 1234567"
              onChange={(e) => setPhone(e.target.value)}
              className="tnum min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 font-mono text-[1rem] text-ink placeholder:text-faint focus:outline-none"
            />
            {isValidPkMobile(phone) && (
              <Check className="mr-3 size-4 flex-none text-ok" strokeWidth={3} />
            )}
          </div>
        </div>

        {known ? (
          <div className="rounded-lg border border-ok/30 bg-ok/[.07] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-ok/15 text-ok">
                <User className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[0.95rem] font-bold text-ink">
                  {known.full_name ?? 'Known customer'}
                </p>
                <p className="text-[0.82rem] text-muted">
                  {known.total_visits} {known.total_visits === 1 ? 'visit' : 'visits'}
                </p>
                {known.notes && (
                  <p className="mt-1.5 rounded bg-white px-2.5 py-1.5 text-[0.8rem] font-medium italic text-ink">
                    &ldquo;{known.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              Name
            </label>
            <input
              value={name} placeholder="Their name"
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-line2 bg-white px-4 py-3 text-[0.97rem] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
        )}

        {/* ---- services ---- */}
        <div>
          <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
            What are they having?
          </label>
          <div className="space-y-3">
            {groups.filter(g => g.services.length > 0).map(g => (
              <div key={g.id} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 rounded bg-soft px-2 py-1 font-display text-[0.6rem] font-bold uppercase tracking-wide text-faint">
                  {g.name}
                </span>
                {g.services.map(s => {
                  const on = picked.includes(s.id);
                  const n = picked.indexOf(s.id) + 1;
                  return (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      className={cn(
                        'relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.85rem] transition-all',
                        on ? 'border-brand bg-brand font-semibold text-white'
                           : 'border-line2 bg-white text-ink hover:border-faint',
                      )}>
                      {on && picked.length > 1 && (
                        <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full bg-ink font-mono text-[0.58rem] font-bold text-white">
                          {n}
                        </span>
                      )}
                      {s.name}
                      <span className={cn('tnum text-[0.7rem]', on ? 'text-white/70' : 'text-faint')}>
                        {s.duration_minutes}m
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ---- when ---- */}
        {picked.length > 0 && (
          <div>
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              When?
            </label>

            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {days.map(d => {
                const iso = d.toISOString().slice(0, 10);
                const on = iso === date;
                const isToday = iso === new Date().toISOString().slice(0, 10);
                return (
                  <button key={iso} type="button" onClick={() => setDate(iso)}
                    className={cn(
                      'flex-none rounded-sm border px-3 py-2 text-center transition-all',
                      on ? 'border-brand bg-brand text-white'
                         : 'border-line2 bg-white text-ink hover:border-faint',
                    )}>
                    <span className="block text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">
                      {isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span className="tnum block font-display text-[0.95rem] font-bold">
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {slots === null ? (
              <div className="grid place-items-center py-6 text-faint">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              /* Honest empty state. Not "no slots" and stop — tell her WHY,
                 and what to do about it. */
              <div className="rounded-lg border border-line bg-soft px-4 py-5 text-center">
                <p className="font-display text-[0.92rem] font-bold text-ink">
                  Nothing free that day.
                </p>
                <p className="mt-1 text-[0.83rem] leading-relaxed text-muted">
                  Everyone who can do these services is booked, on leave, or you&apos;re
                  closed. Try another day.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {slots.map(s => {
                  const on = s.start_at === slot;
                  return (
                    <button key={s.start_at} type="button"
                      onClick={() => { setSlot(s.start_at); setStaffId(''); }}
                      className={cn(
                        'tnum rounded-sm border py-2 font-mono text-[0.82rem] transition-all',
                        on ? 'border-brand bg-brand font-semibold text-white'
                           : 'border-line2 bg-white text-ink hover:border-brand',
                      )}>
                      {time(s.start_at)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- who ---- */}
        {chosen && (
          <div>
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              Who will do it?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {chosen.staff.map(s => (
                <button key={s.id} type="button" onClick={() => setStaffId(s.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-sm border px-3.5 py-2.5 text-[0.9rem] transition-all',
                    staffId === s.id
                      ? 'border-brand bg-brand-tint font-semibold text-ink'
                      : 'border-line2 bg-white text-muted hover:border-faint',
                  )}>
                  <User className="size-3.5" />
                  {s.name}
                  {staffId === s.id && <Check className="size-3.5 text-brand" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.87rem] leading-relaxed text-red-700">
            <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-5">
        {picked.length > 0 && (
          <div className="mb-3.5 flex items-center justify-between">
            <span className="tnum text-[0.88rem] text-muted">{minutes} min</span>
            <div className="text-right">
              <p className="font-display text-[0.6rem] font-bold uppercase tracking-wide text-faint">
                Total amount
              </p>
              <p className="tnum font-display text-[1.15rem] font-extrabold text-ink">
                {formatPKR(total)}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2.5">
          <Button block size="lg" loading={busy}
            disabled={!picked.length || !slot || !staffId}
            onClick={() => void submit()}>
            Confirm booking
          </Button>
          <DialogClose asChild>
            <Button size="lg" variant="secondary">Cancel</Button>
          </DialogClose>
        </div>
      </div>
    </DialogContent>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
