'use client';
import * as React from 'react';
import { Ban, AlertCircle, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Staff { id: string; full_name: string; is_bookable: boolean }
interface Conflict {
  id: string; reference: string; customer_name: string;
  staff_name: string | null; start_at: string; services: string[];
}

/**
 * BLOCK TIME.
 *
 * "3-4pm, staff meeting." Used constantly, and currently impossible — which
 * means the calendar offers slots during a meeting she's already committed to.
 *
 * ⚠️  A BLOCK DOES NOT CANCEL APPOINTMENTS ALREADY INSIDE IT.
 *
 * We show her exactly who is affected and let her decide. Silently cancelling
 * six customers because she blocked an hour would be the worst thing this
 * product could do to her.
 */
export function BlockTimeDialog({ staff, onDone, trigger }: {
  staff: Staff[]; onDone: () => Promise<void>; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : <Button variant="secondary" onClick={() => setOpen(true)}>
            <Ban /> Block time
          </Button>}
      {open && (
        <BlockForm staff={staff}
          onDone={async () => { setOpen(false); await onDone(); }} />
      )}
    </Dialog>
  );
}

function BlockForm({ staff, onDone }: {
  staff: Staff[]; onDone: () => Promise<void>;
}) {
  const [staffId, setStaffId] = React.useState<string | null>(null);   // null = everyone
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = React.useState('15:00');
  const [to, setTo] = React.useState('16:00');
  const [reason, setReason] = React.useState('');

  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [checking, setChecking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fromIso = `${date}T${from}:00+05:00`;
  const toIso   = `${date}T${to}:00+05:00`;

  /* She sees the consequence BEFORE she commits to it. Always. */
  React.useEffect(() => {
    if (!date || !from || !to || from >= to) { setConflicts([]); return; }

    let dead = false;
    setChecking(true);

    const t = setTimeout(async () => {
      const p = new URLSearchParams({ from: fromIso, to: toIso });
      if (staffId) p.set('staff_id', staffId);

      const r = await fetch(`/api/v1/conflicts?${p}`);
      const j = await r.json();
      if (dead) return;
      setChecking(false);
      setConflicts(j.data ?? []);
    }, 250);

    return () => { dead = true; clearTimeout(t); };
  }, [staffId, fromIso, toIso, date, from, to]);

  const save = async () => {
    setError(null);

    if (from >= to)      { setError('The end time must be after the start time.'); return; }
    if (!reason.trim())  { setError('Say why — you\u2019ll want to know later.'); return; }

    setBusy(true);
    const res = await fetch('/api/v1/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        from: fromIso,
        to: toIso,
        reason: reason.trim(),
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not block it.'); return; }
    await onDone();
  };

  const bookable = staff.filter(s => s.is_bookable);

  return (
    <DialogContent title="Block time" className="max-w-[500px]">
      <p className="mb-5 -mt-2 text-[0.9rem] text-muted">
        Nobody can be booked during a block.
      </p>

      <div className="max-h-[56vh] space-y-5 overflow-y-auto pr-1">
        {/* who */}
        <div>
          <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
            Who?
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStaffId(null)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[0.88rem] transition-all',
                staffId === null
                  ? 'border-brand bg-brand font-semibold text-white'
                  : 'border-line2 bg-white text-ink hover:border-faint',
              )}>
              <Users className="size-3.5" /> Everyone
            </button>

            {bookable.map(s => (
              <button key={s.id} type="button" onClick={() => setStaffId(s.id)}
                className={cn(
                  'rounded-full border px-4 py-2.5 text-[0.88rem] transition-all',
                  staffId === s.id
                    ? 'border-brand bg-brand font-semibold text-white'
                    : 'border-line2 bg-white text-ink hover:border-faint',
                )}>
                {s.full_name}
              </button>
            ))}
          </div>
        </div>

        {/* when */}
        <div>
          <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
            When?
          </label>

          <Input type="date" value={date} className="mb-2.5"
            onChange={(e) => setDate(e.target.value)} />

          <div className="flex items-center gap-3">
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)}
              className="tnum flex-1 rounded-sm border border-line2 bg-white px-3.5 py-3 font-mono text-[0.95rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15" />
            <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-faint">
              to
            </span>
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)}
              className="tnum flex-1 rounded-sm border border-line2 bg-white px-3.5 py-3 font-mono text-[0.95rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15" />
          </div>
        </div>

        {/* why */}
        <div>
          <label className="mb-2.5 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
            Why?
          </label>
          <Input autoFocus value={reason} placeholder="Staff meeting"
            onChange={(e) => setReason(e.target.value)} />
        </div>

        {/* THE WARNING */}
        {checking ? (
          <div className="flex items-center gap-2 text-[0.85rem] text-faint">
            <Loader2 className="size-3.5 animate-spin" /> Checking…
          </div>
        ) : conflicts.length > 0 ? (
          <div className="rounded-lg border border-brand/30 bg-brand-tint2 p-4">
            <p className="mb-2 flex items-center gap-2 font-display text-[0.9rem] font-bold text-ink">
              <AlertCircle className="size-4 flex-none text-brand" />
              {conflicts.length} {conflicts.length === 1 ? 'appointment is' : 'appointments are'} already booked in this time.
            </p>

            <p className="mb-2.5 text-[0.85rem] leading-relaxed text-ink">
              {conflicts.slice(0, 4).map(c => (
                <span key={c.id} className="mr-1">
                  <b className="font-display font-bold">{c.customer_name}</b>{' '}
                  <span className="tnum font-mono text-muted">
                    {new Date(c.start_at).toLocaleTimeString('en-GB',
                      { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {' · '}
                </span>
              ))}
              {conflicts.length > 4 && (
                <span className="text-faint">and {conflicts.length - 4} more</span>
              )}
            </p>

            <p className="text-[0.79rem] leading-relaxed text-muted">
              Blocking won&apos;t cancel them —{' '}
              <b className="font-semibold text-ink">you&apos;ll need to move these first.</b>
            </p>
          </div>
        ) : null}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.86rem] text-red-700">
            <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2.5 border-t border-line pt-5">
        <Button block size="lg" loading={busy} onClick={() => void save()}>
          Block it
        </Button>
        <DialogClose asChild>
          <Button size="lg" variant="secondary">Cancel</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
