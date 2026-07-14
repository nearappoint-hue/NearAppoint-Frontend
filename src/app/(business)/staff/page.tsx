'use client';
import * as React from 'react';
import Link from 'next/link';
import { Plus, Trash2, Loader2, AlertCircle, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout } from '@/components/business/panel';
import { formatAsTyped } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface Member {
  id: string; full_name: string; phone: string;
  gender: 'female' | 'male' | null; is_bookable: boolean; service_ids: string[];
}
interface Service { id: string; name: string }
interface Group { id: string; name: string; services: Service[] }

export default function StaffPage() {
  const [staff, setStaff] = React.useState<Member[] | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [s, m] = await Promise.all([
      fetch('/api/v1/staff').then(r => r.json()),
      fetch('/api/v1/services').then(r => r.json()),
    ]);
    if (s.error) { setError(s.error.title); return; }
    setStaff(s.data);
    setGroups(m.data ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const allServices = groups.flatMap(g => g.services);

  if (staff === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  /**
   * Staff without services can't be booked for anything. Send her to build the
   * menu first rather than letting her add six stylists who can do nothing.
   */
  if (allServices.length === 0) {
    return (
      <div className="w-full">
        <PageHeader title="Staff" />
        <Callout className="py-12 text-center">
          <h2 className="mb-2.5 text-[1.3rem]">Add your services first.</h2>
          <p className="mx-auto mb-6 max-w-[42ch] text-[0.94rem] leading-relaxed text-muted">
            Staff are assigned to the services they can do — so the menu has to
            exist before the team does.
          </p>
          <Button asChild size="lg">
            <Link href="/services">Add services <ArrowRight /></Link>
          </Button>
        </Callout>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Staff"
        subtitle={staff.length === 0 ? 'Nobody added yet.' : `${staff.length} on the team`}
        actions={staff.length > 0 ? <AddStaffDialog groups={groups} onDone={load} /> : undefined}
      />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      {staff.length === 0 ? (
        <Callout className="py-12 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-white text-brand">
            <Users className="size-6" />
          </div>
          <h2 className="mb-2.5 text-[1.3rem]">Who works here?</h2>
          <p className="mx-auto mb-7 max-w-[44ch] text-[0.94rem] leading-relaxed text-muted">
            Add each person and tick what they do. They don&apos;t need accounts or
            passwords — they just need to exist on the calendar.
          </p>
          <AddStaffDialog groups={groups} onDone={load} trigger={
            <Button size="lg"><Plus /> Add someone</Button>
          } />
        </Callout>
      ) : (
        <Panel>
          {staff.map(m => (
            <StaffRow key={m.id} member={m} groups={groups} onDone={load} />
          ))}
        </Panel>
      )}
    </div>
  );
}

function StaffRow({ member, groups, onDone }: {
  member: Member; groups: Group[]; onDone: () => Promise<void>;
}) {
  const names = groups.flatMap(g => g.services)
    .filter(s => member.service_ids.includes(s.id))
    .map(s => s.name);

  const del = async () => {
    await fetch(`/api/v1/staff/${member.id}`, { method: 'DELETE' });
    await onDone();
  };

  const initials = member.full_name.split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-tint font-display text-[0.82rem] font-bold text-brand">
        {initials}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[0.98rem] font-bold text-ink">{member.full_name}</p>
        <p className="tnum mt-0.5 font-mono text-[0.8rem] text-muted">
          {member.phone.replace('+92', '0')}
        </p>

        {names.length === 0 ? (
          /* She can't be booked for anything. Say so, plainly, in orange — this
             is a broken staff record and it will silently produce zero bookings. */
          <p className="mt-1.5 text-[0.8rem] font-semibold text-brand">
            No services assigned — can&apos;t be booked
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {names.slice(0, 3).map(n => (
              <span key={n}
                className="rounded bg-soft px-2 py-0.5 text-[0.72rem] font-medium text-muted">
                {n}
              </span>
            ))}
            {names.length > 3 && (
              <span className="rounded bg-soft px-2 py-0.5 text-[0.72rem] font-medium text-faint">
                +{names.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <EditStaffDialog member={member} groups={groups} onDone={onDone} />
        <button onClick={() => void del()} aria-label={`Remove ${member.full_name}`}
          className="grid size-9 place-items-center rounded-sm text-faint transition-colors hover:bg-red-50 hover:text-bad">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AddStaffDialog({ groups, onDone, trigger }: {
  groups: Group[]; onDone: () => Promise<void>; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : <Button onClick={() => setOpen(true)}><Plus /> Add staff</Button>}
      <StaffForm groups={groups} onDone={async () => { setOpen(false); await onDone(); }} />
    </Dialog>
  );
}

function EditStaffDialog({ member, groups, onDone }: {
  member: Member; groups: Group[]; onDone: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Edit</Button>
      <StaffForm member={member} groups={groups}
        onDone={async () => { setOpen(false); await onDone(); }} />
    </Dialog>
  );
}

function StaffForm({ member, groups, onDone }: {
  member?: Member; groups: Group[]; onDone: () => Promise<void>;
}) {
  const [name, setName] = React.useState(member?.full_name ?? '');
  const [phone, setPhone] = React.useState(member?.phone.replace('+92', '') ?? '');
  const [gender, setGender] = React.useState<'female' | 'male' | ''>(member?.gender ?? '');
  const [picked, setPicked] = React.useState<Set<string>>(new Set(member?.service_ids ?? []));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const save = async () => {
    setError(null);
    setBusy(true);

    const body = {
      full_name: name,
      phone,
      gender: gender || null,
      service_ids: [...picked],
    };

    const res = member
      ? await fetch(`/api/v1/staff/${member.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body) })
      : await fetch('/api/v1/staff', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body) });

    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }
    await onDone();
  };

  const real = groups.filter(g => g.services.length > 0);

  return (
    <DialogContent title={member ? 'Edit staff' : 'Add staff'} className="max-w-[520px]">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className="mb-2 block font-display text-[0.85rem] font-bold">Name</label>
          <Input autoFocus value={name} placeholder="Hina Malik"
            onChange={(e) => setName(e.target.value)} />
        </div>

        {!member && (
          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">Mobile number</label>
            <div className="flex items-center overflow-hidden rounded-sm border border-line2 bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
              <span className="flex-none border-r border-line2 bg-soft px-3.5 py-3 font-mono text-[0.9rem] text-ink">
                +92
              </span>
              <input
                type="tel" inputMode="numeric" maxLength={12}
                value={formatAsTyped(phone)} placeholder="300 1234567"
                onChange={(e) => setPhone(e.target.value)}
                className="tnum min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 font-mono text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[0.78rem] text-faint">
              We&apos;ll send them their day on WhatsApp. They don&apos;t need an account.
            </p>
          </div>
        )}

        <div>
          <label className="mb-2 block font-display text-[0.85rem] font-bold">Gender</label>
          <div className="flex gap-2">
            {(['female', 'male'] as const).map(g => (
              <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                className={cn(
                  'flex-1 rounded-sm border py-2.5 font-display text-[0.9rem] font-semibold capitalize transition-all',
                  gender === g
                    ? 'border-brand bg-brand-tint text-ink'
                    : 'border-line2 bg-white text-muted hover:border-faint',
                )}>
                {g}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[0.78rem] leading-relaxed text-faint">
            Some customers will only book with a woman. This lets them.
          </p>
        </div>

        <div>
          <label className="mb-2 block font-display text-[0.85rem] font-bold">
            What can they do?
          </label>
          <div className="space-y-3">
            {real.map(g => (
              <div key={g.id}>
                <p className="mb-1.5 font-display text-[0.72rem] font-bold uppercase tracking-wider text-faint">
                  {g.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.services.map(s => (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      className={cn(
                        'rounded-sm border px-3 py-1.5 text-[0.84rem] transition-all',
                        picked.has(s.id)
                          ? 'border-brand bg-brand-tint font-semibold text-ink'
                          : 'border-line2 bg-white text-muted hover:border-faint',
                      )}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.86rem] text-red-700">
            <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2.5 border-t border-line pt-5">
        <Button block loading={busy} onClick={() => void save()}>
          {member ? 'Save' : 'Add to team'}
        </Button>
        <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      </div>
    </DialogContent>
  );
}
