'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, AlertCircle, Trash2, Check, X, CalendarOff, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface Leave {
  id: string; staff_id: string; staff_name: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  from: string; to: string; days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  is_current: boolean; is_soon: boolean;
}
interface Sched { id: string; name: string }
interface Conflict {
  id: string; reference: string; customer_name: string;
  staff_name: string | null; start_at: string; services: string[];
}

const TYPE_TONE: Record<string, 'brand' | 'ok' | 'warn' | 'neutral'> = {
  annual: 'neutral', sick: 'warn', unpaid: 'neutral', other: 'neutral',
};

/**
 * LEAVE.
 *
 * ⚠️  APPROVING LEAVE DOES NOT CANCEL HER APPOINTMENTS.
 *
 * That is deliberate and it is the most important decision in this feature.
 *
 * If we silently cancelled them, the owner would approve a holiday and six
 * customers would receive cancellation messages she never saw and never chose
 * to send. She would find out when they turned up angry.
 *
 * Leave blocks FUTURE availability immediately. We then tell her exactly which
 * existing appointments conflict. Moving them is her decision, made with her
 * eyes open.
 */
export default function LeavePage() {
  const [rows, setRows] = React.useState<Leave[] | null>(null);
  const [staff, setStaff] = React.useState<Sched[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [l, s] = await Promise.all([
      fetch('/api/v1/leaves').then(r => r.json()),
      fetch('/api/v1/schedules').then(r => r.json()),
    ]);
    setRows(l.data ?? []);
    setStaff(s.data ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/v1/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/v1/leaves/${id}`, { method: 'DELETE' });
    await load();
  };

  if (rows === null) {
    return <div className="grid place-items-center py-24 text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  const soon = rows.filter(l => l.is_soon && l.status === 'approved');

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Leave"
        subtitle="Holidays, sick days, and days off."
        actions={<AddLeaveDialog staff={staff} onDone={load} />}
      />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      {rows.length === 0 ? (
        <Callout className="py-14 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-white text-brand">
            <CalendarOff className="size-6" />
          </div>
          <h2 className="mb-2 text-[1.25rem]">No leave booked.</h2>
          <p className="mx-auto mb-6 max-w-[42ch] text-[0.92rem] leading-relaxed text-muted">
            When someone takes a holiday or calls in sick, add it here and they&apos;ll
            stop appearing on the calendar for those days.
          </p>
          <AddLeaveDialog staff={staff} onDone={load} trigger={
            <Button size="lg"><Plus /> Add leave</Button>
          } />
        </Callout>
      ) : (
        <Panel header={
          <div className="grid grid-cols-[1.4fr_90px_1fr_80px_100px_90px] gap-3">
            <span>Staff</span>
            <span>Type</span>
            <span>Dates</span>
            <span>Days</span>
            <span>Status</span>
            <span />
          </div>
        }>
          {rows.map(l => (
            <div key={l.id} className={cn(
              'grid grid-cols-[1.4fr_90px_1fr_80px_100px_90px] items-center gap-3 px-5 py-4',
              // Currently on leave — an orange edge, because it changes what she
              // can do TODAY.
              l.is_current && 'border-l-[3px] border-l-brand bg-brand-tint2/50',
            )}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-tint font-display text-[0.72rem] font-bold text-brand">
                  {l.staff_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-[0.92rem] font-bold text-ink">
                    {l.staff_name}
                  </p>
                  {l.is_current && (
                    <p className="text-[0.74rem] font-semibold text-brand">
                      Currently on leave
                    </p>
                  )}
                </div>
              </div>

              <Tag tone={TYPE_TONE[l.type] ?? 'neutral'}>{l.type}</Tag>

              <span className="tnum font-mono text-[0.84rem] text-ink">
                {fmt(l.from)} – {fmt(l.to)}
              </span>

              <span className="tnum text-[0.84rem] text-muted">
                {l.days} {l.days === 1 ? 'day' : 'days'}
              </span>

              {l.status === 'approved' && <Tag tone="ok">Approved</Tag>}
              {l.status === 'pending'  && <Tag tone="brand">Pending</Tag>}
              {l.status === 'rejected' && <Tag>Rejected</Tag>}

              <div className="flex justify-end gap-1">
                {l.status === 'pending' ? (
                  <>
                    <button onClick={() => void decide(l.id, 'approved')}
                      aria-label="Approve"
                      className="grid size-8 place-items-center rounded-sm text-ok transition-colors hover:bg-ok/10">
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                    <button onClick={() => void decide(l.id, 'rejected')}
                      aria-label="Reject"
                      className="grid size-8 place-items-center rounded-sm text-faint transition-colors hover:bg-red-50 hover:text-bad">
                      <X className="size-4" strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => void remove(l.id)}
                    aria-label="Delete"
                    className="grid size-8 place-items-center rounded-sm text-faint transition-colors hover:bg-red-50 hover:text-bad">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {/* The warning she needs BEFORE the holiday starts, not after. */}
      {soon.map(l => (
        <SoonWarning key={l.id} leave={l} />
      ))}
    </div>
  );
}

function SoonWarning({ leave }: { leave: Leave }) {
  const [conflicts, setConflicts] = React.useState<Conflict[] | null>(null);

  React.useEffect(() => {
    const from = `${leave.from}T00:00:00+05:00`;
    const to   = `${leave.to}T23:59:59+05:00`;
    fetch(`/api/v1/conflicts?staff_id=${leave.staff_id}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(j => setConflicts(j.data ?? []));
  }, [leave]);

  if (!conflicts?.length) return null;

  const first = leave.staff_name.split(' ')[0];

  return (
    <Callout className="mt-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 flex-none place-items-center rounded-lg bg-white text-brand">
          <AlertCircle className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="mb-1.5 text-[1.05rem]">
            {first} is on leave from {fmt(leave.from)}.
          </h2>
          <p className="mb-3 max-w-[54ch] text-[0.9rem] leading-relaxed text-muted">
            <b className="font-display font-bold text-ink">
              {conflicts.length} {conflicts.length === 1 ? 'appointment is' : 'appointments are'}
            </b>
            {' '}still booked with {first} during those days. We haven&apos;t cancelled them —
            that&apos;s your call.
          </p>

          <div className="mb-4 space-y-1.5">
            {conflicts.slice(0, 4).map(c => (
              <p key={c.id} className="text-[0.85rem] text-ink">
                <span className="tnum font-mono text-muted">
                  {new Date(c.start_at).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })}
                </span>
                {' · '}
                <b className="font-display font-bold">{c.customer_name}</b>
                {' · '}
                <span className="text-muted">{c.services.join(', ')}</span>
              </p>
            ))}
            {conflicts.length > 4 && (
              <p className="text-[0.83rem] text-faint">
                and {conflicts.length - 4} more
              </p>
            )}
          </div>

          <Button asChild variant="secondary" size="sm">
            <Link href="/calendar">Show them <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </Callout>
  );
}

/* ====================================================================== */

function AddLeaveDialog({ staff, onDone, trigger }: {
  staff: Sched[]; onDone: () => Promise<void>; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [staffId, setStaffId] = React.useState('');
  const [type, setType] = React.useState<'annual' | 'sick' | 'unpaid' | 'other'>('annual');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (staff.length && !staffId) setStaffId(staff[0]!.id);
  }, [staff, staffId]);

  /* Before she commits, show her exactly what breaks. */
  React.useEffect(() => {
    if (!staffId || !from || !to) { setConflicts([]); return; }

    let dead = false;
    fetch(`/api/v1/conflicts?staff_id=${staffId}&from=${from}T00:00:00%2B05:00&to=${to}T23:59:59%2B05:00`)
      .then(r => r.json())
      .then(j => { if (!dead) setConflicts(j.data ?? []); });

    return () => { dead = true; };
  }, [staffId, from, to]);

  const save = async () => {
    setError(null);
    setBusy(true);

    const res = await fetch('/api/v1/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId, type, from, to,
        reason: reason || null,
        status: 'approved',
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setFrom(''); setTo(''); setReason('');
    setOpen(false);
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : <Button onClick={() => setOpen(true)}><Plus /> Add leave</Button>}

      <DialogContent title="Add leave" className="max-w-[480px]">
        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              Who?
            </label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-sm border border-line2 bg-white px-4 py-3 text-[0.95rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15">
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              What kind?
            </label>
            <div className="flex flex-wrap gap-2">
              {(['annual', 'sick', 'unpaid', 'other'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={cn(
                    'rounded-sm border px-4 py-2.5 font-display text-[0.88rem] capitalize transition-all',
                    type === t
                      ? 'border-brand bg-brand-tint font-semibold text-ink'
                      : 'border-line2 bg-white text-muted hover:border-faint',
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
                From
              </label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
                To
              </label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <Input value={reason} placeholder="Note — optional"
            onChange={(e) => setReason(e.target.value)} />

          {/* THE WARNING. She sees the consequence BEFORE she commits to it. */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-brand/30 bg-brand-tint2 p-4">
              <p className="mb-2 flex items-center gap-2 font-display text-[0.88rem] font-bold text-ink">
                <AlertCircle className="size-4 flex-none text-brand" />
                {conflicts.length} {conflicts.length === 1 ? 'appointment is' : 'appointments are'} already booked
              </p>

              <div className="mb-2.5 space-y-1">
                {conflicts.slice(0, 3).map(c => (
                  <p key={c.id} className="text-[0.83rem] text-ink">
                    <span className="tnum font-mono text-muted">
                      {new Date(c.start_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </span>
                    {' · '}{c.customer_name}
                  </p>
                ))}
                {conflicts.length > 3 && (
                  <p className="text-[0.8rem] text-faint">
                    and {conflicts.length - 3} more
                  </p>
                )}
              </div>

              <p className="text-[0.79rem] leading-relaxed text-muted">
                We <b className="font-semibold text-ink">won&apos;t cancel them</b> — you&apos;ll
                need to move them yourself. Nobody new will be able to book these days.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.86rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5 border-t border-line pt-5">
          <Button block loading={busy} disabled={!from || !to}
            onClick={() => void save()}>
            Add leave
          </Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
