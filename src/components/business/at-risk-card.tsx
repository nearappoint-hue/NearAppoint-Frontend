'use client';
import * as React from 'react';
import { AlertTriangle, Phone, History, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AtRisk {
  appointment_id: string;
  customer_name: string;
  phone: string;
  start_at: string;
  no_show_count: number;
  total_visits: number;
  no_reply: boolean;
  reason: string;
}

/**
 * AT RISK TODAY.
 *
 * The card that turns a reminder into money.
 *
 * Two signals, both meaning "phone them NOW, before you lose the hour":
 *
 *   1. FORM     — they have a history of not turning up
 *   2. SILENCE  — they were asked "still coming?" and said nothing
 *
 * Silence after a direct question is the strongest no-show predictor there is.
 * A thirty-second phone call at 2pm either confirms them or frees a 4pm slot
 * she can still sell. Either way she wins.
 *
 * The card only appears when there IS someone at risk. A permanent empty
 * "at risk: 0" panel is noise, and noise gets ignored — including on the day it
 * finally matters.
 */
export function AtRiskCard() {
  const [rows, setRows] = React.useState<AtRisk[]>([]);

  React.useEffect(() => {
    fetch('/api/v1/at-risk')
      .then(r => r.json())
      .then(j => setRows(j.data ?? []))
      .catch(() => setRows([]));
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-brand/30 bg-white">
      <div className="flex items-center gap-2 border-b border-brand/20 bg-brand-tint2 px-5 py-3">
        <AlertTriangle className="size-4 flex-none text-brand" />
        <span className="font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-brand">
          At risk today
        </span>
        <span className="tnum ml-auto font-mono text-[0.78rem] text-muted">
          {rows.length}
        </span>
      </div>

      <div className="divide-y divide-line">
        {rows.map(r => (
          <div key={r.appointment_id}
            className="flex flex-wrap items-center gap-3.5 px-5 py-4">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-soft font-display text-[0.72rem] font-bold text-muted">
              {r.customer_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <p className="font-display text-[0.95rem] font-bold text-ink">
                  {r.customer_name}
                </p>
                <span className="tnum font-mono text-[0.84rem] text-brand">
                  {new Date(r.start_at).toLocaleTimeString('en-GB',
                    { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>

              <p className="mt-0.5 flex items-center gap-1.5 text-[0.8rem] text-muted">
                <History className="size-3 flex-none" />
                {r.reason}
              </p>
            </div>

            {/* Thirty seconds on the phone. Either she confirms, or the slot
                frees up while it's still sellable. */}
            <a href={`tel:${r.phone}`}
              className="inline-flex flex-none items-center gap-2 rounded-sm border border-brand px-4 py-2.5 font-display text-[0.85rem] font-bold text-brand transition-colors hover:bg-brand hover:text-white">
              <Phone className="size-3.5" /> Call them
            </a>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 border-t border-line bg-soft/60 px-5 py-3">
        <Info className="mt-0.5 size-3.5 flex-none text-faint" />
        <p className="text-[0.8rem] leading-relaxed text-muted">
          These customers haven&apos;t replied to their reminder, or have missed
          appointments before. A quick call now is cheaper than an empty chair.
        </p>
      </div>
    </div>
  );
}
