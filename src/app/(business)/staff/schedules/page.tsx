'use client';
import * as React from 'react';
import { Loader2, Check, Copy, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface DayHours { dow: number; opens: string; closes: string; closed: boolean }
interface Sched {
  id: string; name: string; is_custom: boolean;
  hours: DayHours[]; on_leave_now: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];   // Monday first. Nobody's week starts on Sunday.

const DEFAULT_HOURS: DayHours[] = ORDER.map(dow => ({
  dow, opens: '11:00', closes: '21:00', closed: dow === 0,
}));

/**
 * STAFF SCHEDULES.
 *
 * Before this, everyone worked the salon's hours. Hina taking Tuesdays off was
 * impossible — so the calendar offered a Tuesday slot with Hina, a customer
 * booked it, and the salon had to phone her back and unbook her.
 *
 * That is the calendar LYING, and it is the fastest way to make an owner stop
 * trusting the product.
 *
 * THE INHERITANCE MODEL: most staff have no rows at all, and that is CORRECT.
 * Absence means "she works the salon's hours". We do not copy the branch hours
 * into seven rows per person — if we did, changing the salon's hours would
 * silently fail to change theirs.
 */
export default function SchedulesPage() {
  const [rows, setRows] = React.useState<Sched[] | null>(null);
  const [sel, setSel] = React.useState<string>('');
  const [hours, setHours] = React.useState<DayHours[]>(DEFAULT_HOURS);
  const [custom, setCustom] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/schedules');
    const j = await r.json();
    const data: Sched[] = j.data ?? [];
    setRows(data);
    if (!sel && data.length) setSel(data[0]!.id);
  }, [sel]);

  React.useEffect(() => { void load(); }, [load]);

  // When she picks a different person, load their hours.
  React.useEffect(() => {
    const s = rows?.find(r => r.id === sel);
    if (!s) return;
    setCustom(s.is_custom);
    setHours(s.is_custom && s.hours.length
      ? ORDER.map(dow => s.hours.find(h => h.dow === dow)
          ?? { dow, opens: '11:00', closes: '21:00', closed: dow === 0 })
      : DEFAULT_HOURS);
    setSaved(false);
    setError(null);
  }, [sel, rows]);

  const set = (dow: number, patch: Partial<DayHours>) => {
    setHours(hs => hs.map(h => h.dow === dow ? { ...h, ...patch } : h));
    setSaved(false);
  };

  const copyToAll = (from: DayHours) => {
    setHours(hs => hs.map(h =>
      h.dow === from.dow || h.closed
        ? h
        : { ...h, opens: from.opens, closes: from.closes }));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);

    const res = await fetch('/api/v1/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: sel,
        // Toggle OFF = she goes back to the salon's hours. Not a data loss —
        // it's the correct way to say "she's normal again".
        hours: custom ? hours : null,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setRows(json.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  if (rows === null) {
    return <div className="grid place-items-center py-24 text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  if (rows.length === 0) {
    return (
      <div className="w-full">
        <PageHeader title="Staff schedules" />
        <Callout className="py-14 text-center">
          <h2 className="mb-2 text-[1.25rem]">Add your staff first.</h2>
          <p className="mx-auto max-w-[40ch] text-[0.92rem] leading-relaxed text-muted">
            Once your team exists, you can give each person their own hours.
          </p>
        </Callout>
      </div>
    );
  }

  const current = rows.find(r => r.id === sel);

  return (
    <div className="w-full">
      <PageHeader
        title="Staff schedules"
        subtitle="Who works when. Leave this alone if everyone works your normal hours."
      />

      {/* staff tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {rows.map(s => {
          const on = s.id === sel;
          return (
            <button key={s.id} onClick={() => setSel(s.id)}
              className={cn(
                'flex flex-none items-center gap-2.5 border-b-2 px-4 py-3 transition-colors',
                on ? 'border-brand' : 'border-transparent hover:bg-soft',
              )}>
              <span className={cn(
                'grid size-8 place-items-center rounded-full font-display text-[0.7rem] font-bold',
                on ? 'bg-brand-tint text-brand' : 'bg-soft text-muted',
              )}>
                {s.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <span className={cn(
                'whitespace-nowrap font-display text-[0.92rem] font-bold',
                on ? 'text-brand' : 'text-muted',
              )}>
                {s.name}
              </span>
              {s.on_leave_now && <Tag tone="warn">On leave</Tag>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <Panel>
            {/* THE TOGGLE. Off = she inherits the salon's hours, which is what
                most staff should do. */}
            <label className="flex cursor-pointer items-center justify-between gap-4 p-5">
              <div>
                <p className="font-display text-[0.98rem] font-bold text-ink">
                  {current?.name.split(' ')[0]} works the salon&apos;s normal hours
                </p>
                <p className="mt-0.5 text-[0.84rem] text-muted">
                  Turn this off to give them their own hours.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={!custom}
                onClick={() => { setCustom(!custom); setSaved(false); }}
                className={cn(
                  'relative h-6 w-11 flex-none rounded-full transition-colors',
                  !custom ? 'bg-brand' : 'bg-line2',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  !custom ? 'translate-x-[22px]' : 'translate-x-0.5',
                )} />
              </button>
            </label>

            {custom && ORDER.map(dow => {
              const h = hours.find(x => x.dow === dow)!;
              return (
                <div key={dow} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <label className="flex w-[130px] flex-none cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={!h.closed}
                      onChange={(e) => set(dow, { closed: !e.target.checked })}
                      className="size-4 accent-brand"
                    />
                    <span className={cn(
                      'font-display text-[0.92rem] font-bold',
                      h.closed ? 'text-faint' : 'text-ink',
                    )}>
                      {DAYS[dow]}
                    </span>
                  </label>

                  {h.closed ? (
                    <span className="text-[0.88rem] text-faint">Day off</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <input type="time" value={h.opens}
                          onChange={(e) => set(dow, { opens: e.target.value })}
                          className="tnum rounded-sm border border-line2 bg-white px-3 py-2 font-mono text-[0.88rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15" />
                        <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-faint">
                          to
                        </span>
                        <input type="time" value={h.closes}
                          onChange={(e) => set(dow, { closes: e.target.value })}
                          className="tnum rounded-sm border border-line2 bg-white px-3 py-2 font-mono text-[0.88rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15" />
                      </div>

                      <button onClick={() => copyToAll(h)}
                        className="ml-auto inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-faint transition-colors hover:text-brand">
                        <Copy className="size-3" /> Copy to all
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </Panel>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Button size="lg" loading={busy} onClick={() => void save()}>
              Save changes
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-ok">
                <Check className="size-4" strokeWidth={3} /> Saved
              </span>
            )}
          </div>
        </div>

        {/* right rail */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="mb-3 flex items-start gap-2 text-[0.86rem] leading-relaxed text-muted">
              <Info className="mt-0.5 size-4 flex-none text-brand" />
              <span>
                <b className="font-display font-bold text-ink">
                  Everyone else works your salon hours.
                </b>
                <br />
                You only need to set this for people who are different.
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <p className="mb-3.5 font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
              Your team
            </p>
            <div className="space-y-2.5">
              {rows.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[0.88rem] text-ink">{s.name}</span>
                  {s.is_custom
                    ? <Tag tone="brand">Custom</Tag>
                    : <Tag>Standard</Tag>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
