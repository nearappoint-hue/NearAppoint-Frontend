'use client';
import * as React from 'react';
import { Moon, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface Override {
  id: string;
  kind: 'seasonal' | 'closure' | 'special';
  name: string;
  from: string;
  to: string;
  hours: { dow: number; opens: string; closes: string }[] | null;
  is_closed: boolean;
  is_active: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * SPECIAL HOURS.
 *
 * RAMADAN IS NOT AN EDGE CASE.
 *
 * She inverts her entire schedule for thirty days — opening mid-afternoon,
 * running past midnight. The three days before Eid are the highest-revenue
 * period of her year, and Chaand Raat is the single biggest night.
 *
 * A weekly template cannot express "for these thirty days, my whole pattern is
 * different." The business that misses this loses its biggest week — and blames
 * us, correctly.
 */
export default function SpecialHoursPage() {
  const [rows, setRows] = React.useState<Override[] | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/overrides');
    const j = await r.json();
    setRows(j.data ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    await fetch(`/api/v1/overrides/${id}`, { method: 'DELETE' });
    await load();
  };

  if (rows === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  const hasRamadan = rows.some(r => /ramadan/i.test(r.name));

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title="Special hours"
        subtitle="Ramadan, Eid, and any day that isn't a normal day."
        actions={<OverrideDialog onDone={load} />}
      />

      {!hasRamadan && (
        <Callout className="mb-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 flex-none place-items-center rounded-lg bg-white text-brand">
              <Moon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1.5 text-[1.15rem]">Set your Ramadan hours.</h2>
              <p className="max-w-[54ch] text-[0.91rem] leading-relaxed text-muted">
                We know you change everything for those thirty days — and that
                Chaand Raat is your biggest night of the year. Set it once here
                and your calendar follows, without touching your normal hours.
              </p>
              <div className="mt-4">
                <OverrideDialog onDone={load} preset="ramadan" trigger={
                  <Button>Set Ramadan hours</Button>
                } />
              </div>
            </div>
          </div>
        </Callout>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="py-14 text-center">
            <p className="font-display text-[1.05rem] font-bold text-ink">
              No special hours set.
            </p>
            <p className="mx-auto mt-1.5 max-w-[40ch] text-[0.88rem] leading-relaxed text-muted">
              Your normal opening hours apply every day.
            </p>
          </div>
        </Panel>
      ) : (
        <Panel>
          {rows.map(o => (
            <div key={o.id} className="flex flex-wrap items-center gap-3.5 p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-display text-[1rem] font-bold text-ink">{o.name}</p>
                  {o.is_active && <Tag tone="brand">Active</Tag>}
                  {o.is_closed && <Tag>Closed</Tag>}
                </div>
                <p className="tnum font-mono text-[0.8rem] text-muted">
                  {fmt(o.from)} – {fmt(o.to)}
                </p>
                {o.hours?.length ? (
                  <p className="tnum mt-0.5 font-mono text-[0.8rem] text-muted">
                    {summarise(o.hours)}
                  </p>
                ) : null}
              </div>

              <button onClick={() => void remove(o.id)} aria-label={`Delete ${o.name}`}
                className="grid size-9 place-items-center rounded-sm text-faint transition-colors hover:bg-red-50 hover:text-bad">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

function OverrideDialog({ onDone, preset, trigger }: {
  onDone: () => Promise<void>; preset?: 'ramadan'; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(preset === 'ramadan' ? 'Ramadan Hours' : '');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [closed, setClosed] = React.useState(false);

  // Ramadan default: 3pm to midnight, every day. She adjusts from there.
  const [hours, setHours] = React.useState(() =>
    Array.from({ length: 7 }, (_, dow) => ({
      dow,
      opens: preset === 'ramadan' ? '15:00' : '11:00',
      closes: preset === 'ramadan' ? '23:59' : '21:00',
      on: true,
    })),
  );

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setError(null);
    setBusy(true);

    const res = await fetch('/api/v1/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: closed ? 'closure' : 'seasonal',
        name, from, to,
        is_closed: closed,
        hours: closed ? null
          : hours.filter(h => h.on).map(({ dow, opens, closes }) => ({ dow, opens, closes })),
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setOpen(false);
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : <Button variant="secondary" onClick={() => setOpen(true)}>
            <Plus /> Add special hours
          </Button>}

      <DialogContent title="Special hours" className="max-w-[520px]">
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">Name</label>
            <Input autoFocus value={name} placeholder="Ramadan Hours"
              onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-line2 bg-white p-3">
            <input type="checkbox" checked={closed}
              onChange={(e) => setClosed(e.target.checked)}
              className="size-4 accent-brand" />
            <span className="font-display text-[0.9rem] font-semibold text-ink">
              Closed for these dates
            </span>
          </label>

          {!closed && (
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">
                Hours during this period
              </label>
              <div className="space-y-1.5">
                {hours.map((h, i) => (
                  <div key={h.dow} className="flex items-center gap-2.5">
                    <label className="flex w-[74px] flex-none cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={h.on}
                        onChange={(e) => setHours(hs => hs.map((x, j) =>
                          j === i ? { ...x, on: e.target.checked } : x))}
                        className="size-3.5 accent-brand" />
                      <span className={cn(
                        'font-display text-[0.85rem] font-semibold',
                        h.on ? 'text-ink' : 'text-faint',
                      )}>
                        {DAYS[h.dow]}
                      </span>
                    </label>

                    {h.on ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={h.opens}
                          onChange={(e) => setHours(hs => hs.map((x, j) =>
                            j === i ? { ...x, opens: e.target.value } : x))}
                          className="tnum rounded-sm border border-line2 bg-white px-2.5 py-1.5 font-mono text-[0.84rem] focus:border-brand focus:outline-none" />
                        <span className="text-[0.8rem] text-faint">to</span>
                        <input type="time" value={h.closes}
                          onChange={(e) => setHours(hs => hs.map((x, j) =>
                            j === i ? { ...x, closes: e.target.value } : x))}
                          className="tnum rounded-sm border border-line2 bg-white px-2.5 py-1.5 font-mono text-[0.84rem] focus:border-brand focus:outline-none" />
                      </div>
                    ) : (
                      <span className="text-[0.84rem] text-faint">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-2.5 text-[0.78rem] leading-relaxed text-faint">
                Running past midnight? Set the close time to 23:59 for now — we&apos;re
                adding proper past-midnight hours for Chaand Raat.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.86rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5 border-t border-line pt-5">
          <Button block loading={busy} onClick={() => void save()}>Save</Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

function summarise(hours: { dow: number; opens: string; closes: string }[]): string {
  if (!hours.length) return '';
  const same = hours.every(h => h.opens === hours[0]!.opens && h.closes === hours[0]!.closes);
  if (same && hours.length === 7) return `Daily ${hours[0]!.opens} – ${hours[0]!.closes}`;
  if (same) return `${hours.map(h => DAYS[h.dow]).join(', ')} ${hours[0]!.opens} – ${hours[0]!.closes}`;
  return `${hours.length} days`;
}
