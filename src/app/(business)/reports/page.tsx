'use client';
import * as React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Loader2, TrendingUp, TrendingDown, BarChart3, Plus, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { formatPKR } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Summary {
  revenue: number; revenue_prev: number; revenue_change: number | null;
  appointments: number; completed: number;
  no_shows: number; no_show_rate: number; repeat_rate: number;
}
interface DayRevenue { date: string; day: string; revenue: number; count: number }
interface PeakCell   { dow: number; hour: number; count: number }
interface StaffRow   { staff_id: string; name: string; appointments: number; services: number; revenue: number }
interface ServiceRow { name: string; count: number; revenue: number }
interface Report {
  summary: Summary; by_day: DayRevenue[]; peak: PeakCell[];
  staff: StaffRow[]; services: ServiceRow[];
}

const RANGES = [
  { key: '7',  label: 'Last 7 days',  days: 6 },
  { key: '30', label: 'Last 30 days', days: 29 },
  { key: 'm',  label: 'This month',   days: null },
] as const;

/**
 * REPORTS.
 *
 * Not a vanity dashboard. Four questions she actually asks:
 *
 *   1. Am I making more or less than last week?
 *   2. WHEN am I busy?          -> so she can staff the right hours
 *   3. Who on my team is earning?
 *   4. Are people coming back?  -> the only number that predicts survival
 *
 * Everything below is real data from real appointments. No sample series, no
 * placeholder bars. A chart that lies to make a screenshot look good is worse
 * than no chart — she will make a staffing decision on it.
 */
export default function ReportsPage() {
  const [range, setRange] = React.useState<string>('7');
  const [data, setData] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  const { from, to } = React.useMemo(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);

    if (range === 'm') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: first.toISOString().slice(0, 10), to };
    }

    const r = RANGES.find(x => x.key === range)!;
    const d = new Date();
    d.setDate(d.getDate() - (r.days ?? 6));
    return { from: d.toISOString().slice(0, 10), to };
  }, [range]);

  React.useEffect(() => {
    let dead = false;
    setLoading(true);

    fetch(`/api/v1/reports?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(j => { if (!dead) { setData(j.data ?? null); setLoading(false); } });

    return () => { dead = true; };
  }, [from, to]);

  if (loading && !data) {
    return <div className="grid place-items-center py-24 text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  const s = data?.summary;
  const hasData = (s?.appointments ?? 0) > 0;

  return (
    <div className="w-full">
      <PageHeader
        title="Reports"
        subtitle="What actually happened, and when."
        actions={
          <div className="flex gap-1.5 rounded-full border border-line2 bg-white p-1">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-full px-4 py-2 font-display text-[0.84rem] font-semibold transition-colors',
                  range === r.key
                    ? 'bg-brand text-white'
                    : 'text-muted hover:bg-soft hover:text-ink',
                )}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {!hasData ? (
        <Callout className="py-20 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-lg bg-white text-brand">
            <BarChart3 className="size-6" />
          </div>
          <h2 className="mb-2.5 text-[1.4rem]">Nothing to report yet.</h2>
          <p className="mx-auto mb-7 max-w-[42ch] text-[0.95rem] leading-relaxed text-muted">
            Once you&apos;ve taken a few bookings, this is where you&apos;ll see what&apos;s
            working — and when you&apos;re actually busy.
          </p>
          <Button asChild size="lg" variant="secondary">
            <a href="/today"><Plus /> Add a walk-in</a>
          </Button>
        </Callout>
      ) : (
        <div className={cn('space-y-6', loading && 'opacity-60')}>

          {/* ---------- headline ---------- */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Revenue"
              value={formatPKR(s!.revenue)}
              accent
              delta={s!.revenue_change}
              deltaLabel="vs last period"
            />
            <MetricCard
              label="Appointments"
              value={String(s!.appointments)}
              hint={`${s!.completed} completed`}
            />
            <MetricCard
              label="No-shows"
              value={String(s!.no_shows)}
              /* Above ~15% and salons stop trusting the calendar. Since we
                 removed the booking fee, this number is the whole ballgame. */
              hint={`${s!.no_show_rate}% of bookings`}
              warn={s!.no_show_rate > 15}
            />
            <MetricCard
              label="Repeat customers"
              value={`${s!.repeat_rate}%`}
              /* The only number that predicts survival. A salon filling chairs
                 with new faces every week is running a treadmill. */
              hint="came back"
            />
          </div>

          {/* ---------- revenue by day — REAL BAR CHART ---------- */}
          <div className="rounded-lg border border-line bg-white p-6">
            <div className="mb-5">
              <h2 className="text-[1.15rem]">Revenue by day</h2>
              <p className="mt-0.5 text-[0.84rem] text-muted">
                What you actually took, each day.
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data!.by_day}
                  margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECEFF3" vertical={false} />

                  <XAxis
                    dataKey={data!.by_day.length > 10 ? 'date' : 'day'}
                    tickFormatter={data!.by_day.length > 10 ? shortDate : undefined}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    interval={data!.by_day.length > 14 ? 3 : 0}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={compact}
                    width={52}
                  />

                  <Tooltip
                    cursor={{ fill: 'rgba(249,115,22,.06)' }}
                    content={<RevenueTip />}
                  />

                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={54}>
                    {data!.by_day.map((d, i) => {
                      const best = Math.max(...data!.by_day.map(x => x.revenue));
                      // Her best day is deeper orange. She should be able to spot
                      // it without reading a single number.
                      return (
                        <Cell key={i}
                          fill={d.revenue > 0 && d.revenue === best ? '#EA580C' : '#F97316'}
                          opacity={d.revenue === 0 ? 0.15 : 1} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* ---------- peak hours ---------- */}
            <div className="rounded-lg border border-line bg-white p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[1.15rem]">
                    <Flame className="size-4 text-brand" /> Peak hours
                  </h2>
                  <p className="mt-0.5 max-w-[40ch] text-[0.84rem] leading-relaxed text-muted">
                    Where the dark squares are is where you need people.
                  </p>
                </div>
              </div>

              <PeakHeatmap cells={data!.peak} />
            </div>

            {/* ---------- team ---------- */}
            <div>
              <Panel header="Your team">
                {data!.staff.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[0.88rem] text-muted">
                    Nothing completed yet in this period.
                  </div>
                ) : (
                  data!.staff.map((st, i) => (
                    <div key={st.staff_id} className="flex items-center gap-3.5 px-5 py-4">
                      <span className="grid size-10 flex-none place-items-center rounded-full bg-brand-tint font-display text-[0.75rem] font-bold text-brand">
                        {st.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display text-[0.93rem] font-bold text-ink">
                            {st.name}
                          </p>
                          {i === 0 && <Tag tone="brand">Top</Tag>}
                        </div>
                        <p className="tnum text-[0.78rem] text-muted">
                          {st.appointments} {st.appointments === 1 ? 'appointment' : 'appointments'}
                        </p>
                      </div>

                      <span className="tnum flex-none font-mono text-[0.9rem] font-semibold text-ink">
                        {formatPKR(st.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          </div>

          {/* ---------- top services ---------- */}
          <Panel header="Most booked services">
            {data!.services.length === 0 ? (
              <div className="px-5 py-10 text-center text-[0.88rem] text-muted">
                Nothing completed yet in this period.
              </div>
            ) : (
              data!.services.map(sv => {
                const max = Math.max(...data!.services.map(x => x.count));
                return (
                  <div key={sv.name} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-[180px] flex-none truncate font-display text-[0.9rem] font-bold text-ink">
                      {sv.name}
                    </span>

                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${(sv.count / max) * 100}%` }} />
                    </div>

                    <span className="tnum w-[62px] flex-none text-right font-mono text-[0.82rem] text-muted">
                      {sv.count}×
                    </span>
                    <span className="tnum w-[92px] flex-none text-right font-mono text-[0.88rem] font-semibold text-ink">
                      {formatPKR(sv.revenue)}
                    </span>
                  </div>
                );
              })
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */

function MetricCard({ label, value, hint, accent, warn, delta, deltaLabel }: {
  label: string; value: string; hint?: string;
  accent?: boolean; warn?: boolean;
  delta?: number | null; deltaLabel?: string;
}) {
  const up = (delta ?? 0) > 0;

  return (
    <div className={cn(
      'rounded-lg border bg-white p-5',
      accent ? 'border-line border-l-[3px] border-l-brand' : 'border-line',
    )}>
      <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
        {label}
      </p>

      <p className={cn(
        'tnum mt-2 font-display text-[1.65rem] font-extrabold leading-none tracking-tight',
        accent ? 'text-brand' : warn ? 'text-bad' : 'text-ink',
      )}>
        {value}
      </p>

      {delta !== undefined && delta !== null ? (
        <p className={cn(
          'tnum mt-2 inline-flex items-center gap-1 text-[0.78rem] font-semibold',
          up ? 'text-ok' : 'text-bad',
        )}>
          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {up ? '+' : ''}{delta}%
          <span className="font-normal text-faint">{deltaLabel}</span>
        </p>
      ) : hint ? (
        <p className="mt-2 text-[0.78rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * PEAK HOURS.
 *
 * The most actionable thing in the product. She looks once and knows:
 * "Saturday 4-7pm is solid and I have two people on. Monday morning is dead
 * and I have three."
 *
 * That single insight is worth the subscription.
 */
function PeakHeatmap({ cells }: { cells: PeakCell[] }) {
  const DOWS  = [1, 2, 3, 4, 5, 6, 0];
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i);   // 10am–9pm

  const lookup = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.dow}-${c.hour}`, c.count);
    return m;
  }, [cells]);

  const max = Math.max(1, ...cells.map(c => c.count));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* hour labels */}
        <div className="mb-1.5 flex gap-1 pl-[44px]">
          {HOURS.map(h => (
            <span key={h}
              className="tnum flex-1 text-center font-mono text-[0.62rem] text-faint">
              {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          {DOWS.map(dow => (
            <div key={dow} className="flex items-center gap-1">
              <span className="w-[40px] flex-none font-display text-[0.72rem] font-bold text-muted">
                {NAMES[dow]}
              </span>

              {HOURS.map(h => {
                const n = lookup.get(`${dow}-${h}`) ?? 0;
                const t = n / max;
                return (
                  <div
                    key={h}
                    title={n ? `${NAMES[dow]} ${h}:00 — ${n} booking${n === 1 ? '' : 's'}` : undefined}
                    className="h-8 flex-1 rounded transition-colors"
                    style={{
                      backgroundColor: n === 0
                        ? '#F8F9FB'
                        : `rgba(249,115,22,${0.14 + t * 0.86})`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-[0.68rem] text-faint">
          <span>Quiet</span>
          {[0.14, 0.35, 0.6, 0.8, 1].map(o => (
            <span key={o} className="size-3 rounded"
              style={{ backgroundColor: `rgba(249,115,22,${o})` }} />
          ))}
          <span>Busy</span>
        </div>
      </div>
    </div>
  );
}

function RevenueTip({ active, payload }: {
  active?: boolean;
  payload?: { payload: DayRevenue }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;

  return (
    <div className="rounded-lg border border-line bg-white px-3.5 py-2.5 shadow-lg">
      <p className="font-display text-[0.78rem] font-bold text-ink">
        {new Date(d.date).toLocaleDateString('en-GB',
          { weekday: 'long', day: 'numeric', month: 'short' })}
      </p>
      <p className="tnum mt-1 font-mono text-[1rem] font-bold text-brand">
        {formatPKR(d.revenue)}
      </p>
      <p className="tnum text-[0.75rem] text-muted">
        {d.count} {d.count === 1 ? 'appointment' : 'appointments'}
      </p>
    </div>
  );
}

const compact = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
