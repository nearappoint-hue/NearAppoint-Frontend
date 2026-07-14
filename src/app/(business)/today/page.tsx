'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Scissors, Users, Clock, ArrowRight, Loader2, Check, CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WalkInDialog } from '@/components/business/walk-in-dialog';
import { BookingDialog } from '@/components/business/booking-dialog';
import { PageHeader } from '@/components/business/page-header';
import { StatCard } from '@/components/business/stat-card';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { formatPKR } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Item {
  id: string; reference: string; status: string;
  customer_name: string; staff_name: string | null;
  services: string[]; start_at: string; end_at: string;
  total: number; source: string;
}
interface Staff { id: string; full_name: string; service_ids: string[]; is_bookable: boolean }
interface Group { id: string; name: string; services: { id: string; name: string; duration_minutes: number; price: number | null }[] }

/**
 * TODAY.
 *
 * The screen she opens every morning, forever.
 *
 * Until she has services and staff, this is a setup checklist — NOT a dashboard
 * of zeroes. An empty revenue chart on day one says "this product has nothing
 * for you." A checklist says "here is the next thing to do."
 */
export default function TodayPage() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);

  const load = React.useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [a, s, g] = await Promise.all([
      fetch(`/api/v1/appointments?date=${today}`).then(r => r.json()),
      fetch('/api/v1/staff').then(r => r.json()),
      fetch('/api/v1/services').then(r => r.json()),
    ]);
    setItems(a.data ?? []);
    setStaff((s.data ?? []).filter((x: Staff) => x.is_bookable));
    setGroups(g.data ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (items === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  const services = groups.flatMap(g => g.services);
  const hasServices = services.length > 0;
  const hasStaff = staff.length > 0;
  const ready = hasServices && hasStaff;

  const done = items.filter(i => i.status === 'completed');
  const earned = done.reduce((n, i) => n + i.total, 0);
  const active = items.filter(i => i.status !== 'completed');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Today"
        subtitle={today}
        actions={ready ? (
          <>
            <BookingDialog groups={groups} staff={staff} onDone={load} />
            <WalkInDialog groups={groups} staff={staff} onDone={load} />
          </>
        ) : undefined}
      />

      {!ready ? (
        /* ---------------- SETUP ---------------- */
        <>
          <Callout className="mb-6">
            <h2 className="mb-2 text-[1.3rem]">Two things and you&apos;re taking bookings.</h2>
            <p className="max-w-[52ch] text-[0.93rem] leading-relaxed text-muted">
              About five minutes. We&apos;ll do it with you.
            </p>
          </Callout>

          <div className="space-y-3">
            <Step n={1} done={hasServices} icon={<Scissors className="size-[18px]" />}
              title="Add your services"
              desc="We'll load the usual ones with typical durations. You set the prices."
              href="/services" />
            <Step n={2} done={hasStaff} icon={<Users className="size-[18px]" />}
              title="Add your staff"
              desc="Who works here and what they do. They don't need accounts."
              href="/staff" locked={!hasServices} />
          </div>
        </>
      ) : (
        /* ---------------- THE DAY ---------------- */
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Appointments" value={String(items.length)} />
            <StatCard label="Completed"    value={String(done.length)} />
            <StatCard label="Earned"       value={formatPKR(earned)} accent />
            <StatCard label="In progress"
              value={String(items.filter(i => i.status === 'in_progress').length)} />
          </div>

          {items.length === 0 ? (
            <Card className="py-16 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-soft text-faint">
                <Clock className="size-6" />
              </div>
              <h2 className="mb-2 text-[1.2rem]">Nothing yet today.</h2>
              <p className="mx-auto mb-6 max-w-[36ch] text-[0.9rem] leading-relaxed text-muted">
                When someone walks in, add them here and they&apos;ll appear on your
                calendar.
              </p>
              <WalkInDialog groups={groups} staff={staff} onDone={load} />
            </Card>
          ) : (
            <div className="space-y-5">
              {active.length > 0 && (
                <Panel>
                  {active.map(i => <Row key={i.id} item={i} onDone={load} />)}
                </Panel>
              )}

              {done.length > 0 && (
                <div>
                  <p className="mb-2.5 px-1 font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-faint">
                    Finished
                  </p>
                  <Panel>
                    {done.map(i => <Row key={i.id} item={i} onDone={load} />)}
                  </Panel>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ item, onDone }: { item: Item; onDone: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);

  const advance = async (status: string) => {
    setBusy(true);
    await fetch(`/api/v1/appointments/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        final_amount: status === 'completed' ? item.total : undefined,
      }),
    });
    setBusy(false);
    await onDone();
  };

  const time = new Date(item.start_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const done = item.status === 'completed';
  const live = item.status === 'in_progress';

  return (
    <div className={cn('flex flex-wrap items-center gap-3.5 p-4', done && 'opacity-55')}>
      <span className="tnum w-[70px] flex-none font-mono text-[0.8rem] text-muted">{time}</span>

      <div className="min-w-0 flex-1">
        <p className={cn(
          'font-display text-[0.95rem] font-bold text-ink',
          done && 'line-through',
        )}>
          {item.customer_name}
        </p>
        <p className="truncate text-[0.8rem] text-muted">
          {item.services.join(', ')}
          {item.staff_name && <span className="text-faint"> · {item.staff_name}</span>}
        </p>
      </div>

      <span className="tnum font-display text-[0.9rem] font-bold text-ink">
        {formatPKR(item.total)}
      </span>

      {done ? (
        <Tag tone="ok"><Check className="size-3" strokeWidth={3} /> Done</Tag>
      ) : live ? (
        <Button size="sm" loading={busy} onClick={() => void advance('completed')}>
          Complete
        </Button>
      ) : (
        <Button size="sm" variant="secondary" loading={busy}
          onClick={() => void advance('in_progress')}>
          <CircleDot className="size-3.5" /> Start
        </Button>
      )}
    </div>
  );
}

function Step({ n, done, icon, title, desc, href, locked }: {
  n: number; done: boolean; icon: React.ReactNode;
  title: string; desc: string; href: string; locked?: boolean;
}) {
  return (
    <Card className={locked ? 'opacity-50' : ''}>
      <div className="flex items-start gap-4">
        <span className={cn(
          'grid size-9 flex-none place-items-center rounded-sm font-display text-[0.85rem] font-bold',
          done ? 'bg-ok/15 text-ok' : 'bg-brand-tint text-brand',
        )}>
          {done ? '✓' : n}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 flex items-center gap-2">{icon} {title}</h3>
          <p className="text-[0.87rem] leading-relaxed text-muted">{desc}</p>
        </div>

        {!done && (
          <Button asChild variant="secondary" size="sm" className="flex-none">
            <Link href={locked ? '#' : href}>Go <ArrowRight /></Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
