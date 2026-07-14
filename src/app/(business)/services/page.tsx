'use client';
import * as React from 'react';
import {
  Plus, Trash2, Sparkles, Clock, Loader2, AlertCircle, FolderPlus, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout } from '@/components/business/panel';
import { formatPKR } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  buffer_after_minutes: number;
  price: number | null;
  booking_policy: 'bookable' | 'consultation_only' | 'disabled';
  policy_reason: string | null;
  is_bookable_online: boolean;
}
interface Group { id: string; name: string; display_order: number; services: Service[] }

export default function ServicesPage() {
  const [groups, setGroups] = React.useState<Group[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch('/api/v1/services');
    const json = await res.json();
    if (!res.ok) { setError(json.error?.title ?? 'Could not load your menu.'); return; }
    setGroups(json.data);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const seed = async () => {
    setBusy(true); setError(null);
    const res = await fetch('/api/v1/services/seed', { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error?.title ?? 'Could not load the templates.'); return; }
    await load();
  };

  const total = groups?.reduce((n, g) => n + g.services.length, 0) ?? 0;
  const unpriced = groups?.reduce(
    (n, g) => n + g.services.filter(s => s.price === null).length, 0) ?? 0;

  if (groups === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Services"
        subtitle={total === 0 ? 'Your menu is empty.' : `${total} services`}
        accent={unpriced > 0 ? `${unpriced} still need a price` : undefined}
        actions={total > 0 ? (
          <>
            <NewGroupDialog onDone={load} />
            <NewServiceDialog groups={groups} onDone={load} />
          </>
        ) : undefined}
      />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      {total === 0 ? (
        /* ---------- EMPTY: the quick-start. This is the whole point. -------- */
        <Callout className="py-12 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-white text-brand">
            <Sparkles className="size-6" />
          </div>
          <h2 className="mb-2.5 text-[1.35rem]">Start with the usual services.</h2>
          <p className="mx-auto mb-7 max-w-[44ch] text-[0.94rem] leading-relaxed text-muted">
            We&apos;ll load the services most hair salons offer, already grouped, with
            typical durations. Delete what you don&apos;t do, rename anything, and add
            your own.
            <br /><br />
            <b className="font-display font-bold text-ink">You set the prices.</b> We
            don&apos;t presume to know what you charge.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button size="lg" loading={busy} onClick={() => void seed()}>
              <Sparkles /> Load the usual services
            </Button>
            <NewServiceDialog groups={[]} onDone={load} trigger={
              <Button size="lg" variant="secondary">Start from scratch</Button>
            } />
          </div>
        </Callout>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <GroupCard key={g.id} group={g} onDone={load} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Group */
function GroupCard({ group, onDone }: { group: Group; onDone: () => Promise<void> }) {
  const del = async () => {
    if (group.id === 'ungrouped') return;
    // Services survive. She deleted a folder, not her menu.
    await fetch(`/api/v1/service-groups/${group.id}`, { method: 'DELETE' });
    await onDone();
  };

  /* The group header is a grey strip INSIDE the card, not a heading above it.
     It reads as one object — a section of her menu — rather than a floating
     label with a list underneath. */
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-soft/70 px-5 py-3.5">
        <h2 className="font-display text-[1rem] font-bold tracking-tight text-ink">
          {group.name}
        </h2>
        {group.id !== 'ungrouped' && (
          <button onClick={() => void del()}
            className="font-display text-[0.65rem] font-bold uppercase tracking-[0.1em] text-faint transition-colors hover:text-bad">
            Delete group
          </button>
        )}
      </div>

      <div className="divide-y divide-line">
        {group.services.map(s => (
          <ServiceRow key={s.id} service={s} onDone={onDone} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Row */
function ServiceRow({ service, onDone }: { service: Service; onDone: () => Promise<void> }) {
  const [price, setPrice] = React.useState(service.price?.toString() ?? '');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const savePrice = async () => {
    const n = Number(price);
    if (!price || Number.isNaN(n) || n < 0) return;
    if (n === service.price) return;

    setSaving(true);
    await fetch(`/api/v1/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: n }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
    await onDone();
  };

  const del = async () => {
    await fetch(`/api/v1/services/${service.id}`, { method: 'DELETE' });
    await onDone();
  };

  const consultOnly = service.booking_policy === 'consultation_only';

  const unpriced = service.price === null;

  return (
    <div className={cn(
      'flex flex-wrap items-center gap-3 px-5 py-4 transition-colors',
      /* Unpriced rows are tinted. Across a long menu she can see instantly what
         still needs her attention, without counting. */
      unpriced && 'bg-brand-tint2/60',
    )}>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[0.95rem] font-bold text-ink">{service.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
          <span className="inline-flex items-center gap-1 tnum">
            <Clock className="size-3" /> {service.duration_minutes} min
          </span>
          {service.buffer_after_minutes > 0 && (
            /* Buffer blocks the calendar but is invisible to the customer.
               She needs to see it; her customer never does. */
            <span className="text-faint tnum">+{service.buffer_after_minutes} min cleanup</span>
          )}
          {consultOnly && (
            <span className="inline-flex items-center gap-1 rounded bg-brand-tint px-1.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-brand">
              <Info className="size-2.5" /> Consultation first
            </span>
          )}
        </p>
        {consultOnly && service.policy_reason && (
          <p className="mt-1.5 max-w-[52ch] text-[0.76rem] leading-relaxed text-faint">
            {service.policy_reason}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={cn(
          'flex items-center overflow-hidden rounded-sm border transition-colors',
          saved ? 'border-ok bg-white'
                : unpriced ? 'border-brand bg-white'
                           : 'border-line2 bg-white',
          'focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15',
        )}>
          <span className="flex-none border-r border-line2 bg-soft px-3 py-2.5 font-mono text-[0.8rem] text-muted">
            Rs
          </span>
          <input
            type="number" inputMode="numeric" min={0}
            value={price}
            placeholder="Set price"
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => void savePrice()}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className={cn(
              'tnum w-[110px] border-0 bg-transparent px-3 py-2.5 font-mono text-[0.9rem] text-ink focus:outline-none',
              unpriced ? 'text-left placeholder:text-brand/60' : 'text-right',
            )}
          />
        </div>

        {saving && <Loader2 className="size-4 animate-spin text-faint" />}

        <button onClick={() => void del()} aria-label={`Delete ${service.name}`}
          className="grid size-9 place-items-center rounded-sm text-faint transition-colors hover:bg-red-50 hover:text-bad">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- New group */
function NewGroupDialog({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await fetch('/api/v1/service-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setBusy(false); setName(''); setOpen(false);
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FolderPlus /> Group
      </Button>
      <DialogContent title="New group">
        <p className="mb-5 text-[0.9rem] leading-relaxed text-muted">
          Group your menu however makes sense to you — &ldquo;Haircuts&rdquo;,
          &ldquo;Bridal&rdquo;, &ldquo;Quick Services&rdquo;. It&apos;s your salon.
        </p>
        <Input
          autoFocus value={name} placeholder="Haircuts &amp; Styling"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void create(); }}
        />
        <div className="mt-5 flex gap-2.5">
          <Button block loading={busy} onClick={() => void create()}>Create</Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------- New service */
function NewServiceDialog({ groups, onDone, trigger }: {
  groups: Group[]; onDone: () => Promise<void>; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [duration, setDuration] = React.useState('30');
  const [buffer, setBuffer] = React.useState('0');
  const [price, setPrice] = React.useState('');
  const [groupId, setGroupId] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const real = groups.filter(g => g.id !== 'ungrouped');

  const create = async () => {
    setError(null);
    if (!name.trim()) { setError('Give the service a name.'); return; }

    setBusy(true);
    const res = await fetch('/api/v1/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        group_id: groupId || null,
        duration_minutes: Number(duration) || 30,
        buffer_minutes: Number(buffer) || 0,
        price: Number(price) || 0,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not add it.'); return; }

    setName(''); setPrice(''); setDuration('30'); setBuffer('0');
    setOpen(false);
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Service</Button>
      )}

      <DialogContent title="Add a service">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">Name</label>
            <Input autoFocus value={name} placeholder="Fade Cut"
              onChange={(e) => setName(e.target.value)} />
          </div>

          {real.length > 0 && (
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">Group</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-sm border border-line2 bg-white px-4 py-3 text-[0.97rem] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15">
                <option value="">Ungrouped</option>
                {real.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">Minutes</label>
              <Input type="number" inputMode="numeric" value={duration}
                onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">Cleanup</label>
              <Input type="number" inputMode="numeric" value={buffer}
                onChange={(e) => setBuffer(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-display text-[0.85rem] font-bold">Price</label>
              <Input type="number" inputMode="numeric" value={price} placeholder="500"
                onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <p className="text-[0.78rem] leading-relaxed text-faint">
            <b>Cleanup</b> blocks your calendar after the service, but your customer
            never sees it. A 45-minute cut with 15 minutes cleanup shows as
            &ldquo;45 min&rdquo; to her, and takes an hour of your chair.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.86rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5">
          <Button block loading={busy} onClick={() => void create()}>Add service</Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
