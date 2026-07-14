'use client';
import * as React from 'react';
import { Loader2, Check, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/business/page-header';
import { Panel } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface Hours { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * OPENING HOURS.
 *
 * The calendar cannot exist without these. A brand-new business gets sensible
 * defaults seeded (11:00-21:00, Mon-Sat) rather than an empty grid, because an
 * empty grid looks broken and she will not know what to do with it.
 *
 * NOT YET BUILT, AND NOT OPTIONAL LATER:
 *   - Ramadan hours. Salons INVERT their schedule for 30 days and run past
 *     midnight. Their biggest revenue week of the year is the three days
 *     before Eid. A product that can't express that is useless to her exactly
 *     when it matters most.
 *   - Friday prayer breaks (12:45-14:15).
 */
export default function HoursPage() {
  const [hours, setHours] = React.useState<Hours[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/v1/hours').then(r => r.json()).then(j => setHours(j.data ?? []));
  }, []);

  const set = (dow: number, patch: Partial<Hours>) => {
    setHours(h => h!.map(d => d.day_of_week === dow ? { ...d, ...patch } : d));
    setSaved(false);
    setError(null);
  };

  // She works 6 days. Typing the same hours six times is a small cruelty.
  const copyToAll = (from: Hours) => {
    setHours(h => h!.map(d =>
      d.day_of_week === from.day_of_week || d.is_closed
        ? d
        : { ...d, opens_at: from.opens_at, closes_at: from.closes_at },
    ));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);

    const res = await fetch('/api/v1/hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setHours(json.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  if (hours === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  // Monday first. Nobody thinks of their week as starting on Sunday.
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(n => hours.find(h => h.day_of_week === n)!);

  return (
    <div className="w-full">
      <PageHeader
        title="Opening hours"
        subtitle="When your doors are open. The calendar follows these."
      />

      <Panel>
        {ordered.map(d => (
          <div key={d.day_of_week} className="flex flex-wrap items-center gap-3 p-4">
            <label className="flex w-[130px] flex-none cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={!d.is_closed}
                onChange={(e) => set(d.day_of_week, { is_closed: !e.target.checked })}
                className="size-4 accent-brand"
              />
              <span className={cn(
                'font-display text-[0.92rem] font-bold',
                d.is_closed ? 'text-faint' : 'text-ink',
              )}>
                {DAYS[d.day_of_week]}
              </span>
            </label>

            {d.is_closed ? (
              <span className="text-[0.88rem] text-faint">Closed</span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <TimeInput value={d.opens_at}
                    onChange={(v) => set(d.day_of_week, { opens_at: v })} />
                  <span className="text-[0.85rem] text-faint">to</span>
                  <TimeInput value={d.closes_at}
                    onChange={(v) => set(d.day_of_week, { closes_at: v })} />
                </div>

                <button onClick={() => copyToAll(d)}
                  className="ml-auto inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-faint transition-colors hover:text-brand">
                  <Copy className="size-3" /> Copy to all
                </button>
              </>
            )}
          </div>
        ))}
      </Panel>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button size="lg" loading={busy} onClick={() => void save()}>Save hours</Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-ok">
            <Check className="size-4" strokeWidth={3} /> Saved
          </span>
        )}
      </div>

      <p className="mt-8 rounded-lg border border-line bg-soft p-4 text-[0.85rem] leading-relaxed text-muted">
        <b className="font-display font-bold text-ink">Ramadan hours are coming.</b>{' '}
        We know you change everything for those thirty days, and that Chaand Raat
        is your biggest night of the year. You&apos;ll be able to set a whole
        different schedule for it, without touching this one.
      </p>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="tnum rounded-sm border border-line2 bg-white px-3 py-2 font-mono text-[0.9rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
    />
  );
}
