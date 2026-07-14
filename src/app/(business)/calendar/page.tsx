'use client';
import * as React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalkInDialog } from '@/components/business/walk-in-dialog';
import { BookingDialog } from '@/components/business/booking-dialog';
import { AppointmentActions } from '@/components/business/appointment-actions';
import { BlockTimeDialog } from '@/components/business/block-time-dialog';
import { Panel } from '@/components/business/panel';
import { cn } from '@/lib/utils';

interface Item {
  id: string; reference: string; status: string;
  customer_name: string; staff_id: string | null; staff_name: string | null;
  services: string[]; service_ids: string[];
  start_at: string; end_at: string; occupies_end_at: string;
  total: number; source: string;
}
interface Staff { id: string; full_name: string; service_ids: string[]; is_bookable: boolean }
interface Group { id: string; name: string; services: { id: string; name: string; duration_minutes: number; price: number | null }[] }
interface Hours { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }

const SLOT_MIN = 15;
const PX_PER_MIN = 1.6;

export default function CalendarPage() {
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [hours, setHours] = React.useState<Hours[]>([]);
  const [now, setNow] = React.useState(new Date());

  const load = React.useCallback(async () => {
    const [a, s, g, h] = await Promise.all([
      fetch(`/api/v1/appointments?date=${date}`).then(r => r.json()),
      fetch('/api/v1/staff').then(r => r.json()),
      fetch('/api/v1/services').then(r => r.json()),
      fetch('/api/v1/hours').then(r => r.json()),
    ]);
    setItems(a.data ?? []);
    setStaff((s.data ?? []).filter((x: Staff) => x.is_bookable));
    setGroups(g.data ?? []);
    setHours(h.data ?? []);
  }, [date]);

  React.useEffect(() => { void load(); }, [load]);

  // The now-line moves. It is the single most-looked-at pixel on this screen.
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const d = new Date(date + 'T12:00:00');
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  const dayHours = hours.find(h => h.day_of_week === d.getDay());
  const openMin  = dayHours && !dayHours.is_closed ? toMin(dayHours.opens_at) : 11 * 60;
  const closeMin = dayHours && !dayHours.is_closed ? toMin(dayHours.closes_at) : 21 * 60;
  const closed   = dayHours?.is_closed ?? false;

  const rows = Math.ceil((closeMin - openMin) / SLOT_MIN);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= openMin && nowMin <= closeMin;

  const shift = (n: number) => {
    const nd = new Date(date + 'T12:00:00');
    nd.setDate(nd.getDate() + n);
    setDate(nd.toISOString().slice(0, 10));
  };

  if (items === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-sm border border-line2 bg-white">
            <button onClick={() => shift(-1)} aria-label="Previous day"
              className="grid size-10 place-items-center border-r border-line2 text-muted transition-colors hover:bg-soft hover:text-ink">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => shift(1)} aria-label="Next day"
              className="grid size-10 place-items-center text-muted transition-colors hover:bg-soft hover:text-ink">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div>
            <h1 className="text-[1.9rem] leading-none">
              {isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'long' })}
            </h1>
            <p className="mt-2 text-[0.9rem] text-muted">
              {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              {' · '}
              <span className="tnum">{items.length}</span> {items.length === 1 ? 'appointment' : 'appointments'}
            </p>
          </div>

          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(today)}>Today</Button>
          )}
        </div>

        {staff.length > 0 && groups.length > 0 && (
          <div className="flex gap-2.5">
            <BlockTimeDialog staff={staff} onDone={load} />
            <BookingDialog groups={groups} staff={staff} onDone={load} />
            <WalkInDialog groups={groups} staff={staff} onDone={load} />
          </div>
        )}
      </div>

      {closed ? (
        <div className="rounded-lg border border-line bg-white py-20 text-center">
          <p className="font-display text-[1.1rem] font-bold text-ink">Closed</p>
          <p className="mt-1 text-[0.9rem] text-muted">
            You&apos;re not open on {d.toLocaleDateString('en-GB', { weekday: 'long' })}s.
          </p>
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-lg border border-line bg-white py-20 text-center">
          <p className="font-display text-[1.1rem] font-bold text-ink">No staff yet</p>
          <p className="mt-1 text-[0.9rem] text-muted">Add your team to see the calendar.</p>
        </div>
      ) : (
        /* ---- THE GRID. Staff columns x time rows. This is her salon floor. ---- */
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <div className="min-w-[640px]">
            {/* header */}
            {/* Staff columns with avatars and a booked count — she sees at a
                glance who is loaded and who is free, before reading a single block. */}
            <div className="sticky top-0 z-10 flex border-b border-line bg-white">
              <div className="w-[62px] flex-none border-r border-line" />
              {staff.map(s => {
                const booked = items.filter(a => a.staff_id === s.id).length;
                return (
                  <div key={s.id}
                    className="flex flex-1 items-center justify-center gap-2.5 border-r border-line px-3 py-3.5 last:border-r-0">
                    <span className="grid size-8 flex-none place-items-center rounded-full bg-brand-tint font-display text-[0.7rem] font-bold text-brand">
                      {s.full_name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[0.92rem] font-bold text-ink">
                        {s.full_name}
                      </p>
                      <p className="tnum text-[0.7rem] text-faint">
                        {booked} booked
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* body */}
            <div className="relative flex">
              {/* time gutter */}
              <div className="w-[62px] flex-none border-r border-line">
                {Array.from({ length: rows }).map((_, i) => {
                  const m = openMin + i * SLOT_MIN;
                  const onHour = m % 60 === 0;
                  return (
                    <div key={i}
                      style={{ height: SLOT_MIN * PX_PER_MIN }}
                      className="pr-2 pt-0.5 text-right">
                      {onHour && (
                        <span className="tnum font-mono text-[0.68rem] text-faint">
                          {label(m)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* staff lanes */}
              {staff.map(s => (
                <div key={s.id} className="relative flex-1 border-r border-line last:border-r-0">
                  {Array.from({ length: rows }).map((_, i) => (
                    <div key={i}
                      style={{ height: SLOT_MIN * PX_PER_MIN }}
                      className={cn(
                        'border-b',
                        (openMin + i * SLOT_MIN) % 60 === 0 ? 'border-line' : 'border-line/40',
                      )}
                    />
                  ))}

                  {items.filter(a => a.staff_id === s.id).map(a => (
                    <AppointmentBlock key={a.id} item={a} openMin={openMin}
                      staff={staff} onDone={load} />
                  ))}
                </div>
              ))}

              {/* THE NOW-LINE. Red. Moves. The most valuable pixel here. */}
              {showNow && (
                <div
                  className="pointer-events-none absolute left-[62px] right-0 z-20 border-t-2 border-brand"
                  style={{ top: (nowMin - openMin) * PX_PER_MIN }}
                >
                  <span className="absolute -left-1.5 -top-[5px] size-2 rounded-full bg-brand" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentBlock({ item, openMin, staff, onDone }: {
  item: Item; openMin: number; staff: Staff[]; onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  const start = new Date(item.start_at);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = new Date(item.end_at).getHours() * 60 + new Date(item.end_at).getMinutes();
  const occMin = new Date(item.occupies_end_at).getHours() * 60
               + new Date(item.occupies_end_at).getMinutes();

  const advance = async (status: string) => {
    setBusy(true);
    if (status === 'completed') {
      await fetch(`/api/v1/appointments/${item.id}/complete`, { method: 'POST' });
    } else {
      await fetch(`/api/v1/appointments/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    }
    setBusy(false);
    await onDone();
  };

  const done = item.status === 'completed';
  const live = item.status === 'in_progress';

  return (
    <div
      className={cn(
        'group absolute inset-x-1.5 overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 transition-colors',
        done ? 'border-l-faint bg-soft'
             : live ? 'border-l-ok bg-ok/[.08]'
                    : 'border-l-brand bg-brand-tint',
      )}
      style={{
        top: (startMin - openMin) * PX_PER_MIN + 2,
        height: Math.max((endMin - startMin) * PX_PER_MIN - 4, 26),
      }}
    >
      <p className={cn(
        'truncate font-display text-[0.78rem] font-bold',
        done ? 'text-faint line-through' : 'text-ink',
      )}>
        {item.customer_name}
      </p>
      <p className="truncate text-[0.68rem] text-muted">{item.services.join(', ')}</p>

      {/* Buffer: a hatched tail she can see, and her customer never will. */}
      {occMin > endMin && !done && (
        <div
          className="absolute inset-x-0 bottom-0 translate-y-full bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(148,163,184,.22)_3px,rgba(148,163,184,.22)_6px)]"
          style={{ height: (occMin - endMin) * PX_PER_MIN }}
        />
      )}

      {/* Actions live in the corner, always reachable. She needs to mark a
          no-show from the calendar, not just from Today. */}
      <div className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <AppointmentActions appt={item} staff={staff} onDone={onDone} compact />
      </div>

      {!done && (
        <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {live ? (
            <button disabled={busy} onClick={() => void advance('completed')}
              className="flex-1 rounded bg-ink py-1 font-display text-[0.62rem] font-bold text-white">
              Done
            </button>
          ) : (
            <button disabled={busy} onClick={() => void advance('in_progress')}
              className="flex-1 rounded bg-ink py-1 font-display text-[0.62rem] font-bold text-white">
              Start
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const label = (m: number) => {
  const h = Math.floor(m / 60);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
};
