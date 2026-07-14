'use client';
import * as React from 'react';
import {
  Search, Plus, Loader2, AlertCircle, StickyNote, ChevronDown, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { formatPKR } from '@/lib/money';
import { formatAsTyped, digitsOnly } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface Customer {
  id: string; full_name: string | null; phone: string;
  total_visits: number; total_spend: number;
  last_visit_at: string | null; notes: string | null; tags: string[] | null;
}
interface Visit {
  id: string; reference: string; date: string;
  services: string[]; staff_name: string | null; total: number; status: string;
}

/**
 * CUSTOMERS.
 *
 * The module that makes the subscription worth paying for.
 *
 * A calendar is replaceable — she could go back to a paper register tomorrow.
 * "Sana, 12 visits, allergic to ammonia, prefers Hina" is not something she can
 * rebuild. That is what keeps her.
 */
export default function CustomersPage() {
  const [rows, setRows] = React.useState<Customer[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const load = React.useCallback(async (query: string) => {
    const r = await fetch(`/api/v1/customers?q=${encodeURIComponent(query)}`);
    const j = await r.json();
    setRows(j.data ?? []);
    setTotal(j.meta?.total ?? 0);
  }, []);

  React.useEffect(() => { void load(''); }, [load]);

  // Debounced search. She types a phone number fast, one digit at a time.
  React.useEffect(() => {
    const t = setTimeout(() => void load(q), 220);
    return () => clearTimeout(t);
  }, [q, load]);

  if (rows === null) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Customers"
        subtitle={`${total} ${total === 1 ? 'customer' : 'customers'}`}
        actions={<AddCustomerDialog onDone={() => load(q)} />}
      />

      {/* PHONE-FIRST SEARCH. The receptionist knows the NUMBER, not the spelling.
          "Fatima" / "Fathima" / "Fatimah" is three spellings of one woman. */}
      <div className="mb-5 flex items-center gap-2.5 rounded-sm border border-line2 bg-white px-4 py-3 focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
        <Search className="size-[18px] flex-none text-faint" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by phone or name"
          className="min-w-0 flex-1 border-0 bg-transparent text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <Callout className="py-14 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-white text-brand">
            <Users className="size-6" />
          </div>
          <h2 className="mb-2 text-[1.25rem]">
            {q ? 'Nobody found.' : 'No customers yet.'}
          </h2>
          <p className="mx-auto max-w-[42ch] text-[0.92rem] leading-relaxed text-muted">
            {q
              ? 'Try a different number or spelling.'
              : 'Every walk-in you add builds this list automatically. You can also add people you already know.'}
          </p>
        </Callout>
      ) : (
        <Panel header={
          <div className="flex items-center justify-between">
            <span>Customer information</span>
            <span className="hidden sm:block">Engagement history</span>
            <span>Total spend</span>
          </div>
        }>
          {rows.map(c => (
            <CustomerRow key={c.id} customer={c}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              onDone={() => load(q)} />
          ))}
        </Panel>
      )}
    </div>
  );
}

function CustomerRow({ customer, open, onToggle, onDone }: {
  customer: Customer; open: boolean; onToggle: () => void; onDone: () => Promise<void>;
}) {
  const [history, setHistory] = React.useState<Visit[] | null>(null);
  const [notes, setNotes] = React.useState(customer.notes ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || history) return;
    fetch(`/api/v1/customers/${customer.id}`)
      .then(r => r.json())
      .then(j => setHistory(j.data ?? []));
  }, [open, history, customer.id]);

  const saveNotes = async () => {
    if (notes === (customer.notes ?? '')) return;
    setSaving(true);
    await fetch(`/api/v1/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    await onDone();
  };

  const initials = (customer.full_name ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const vip = customer.total_visits >= 10;

  return (
    <div className={cn(open && 'bg-brand-tint2/50')}>
      <button onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-3.5 p-4 text-left transition-colors hover:bg-soft/60">
        <span className={cn(
          'grid size-10 flex-none place-items-center rounded-full font-display text-[0.78rem] font-bold',
          vip ? 'bg-brand-tint text-brand' : 'bg-soft text-muted',
        )}>
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.95rem] font-bold text-ink">
            {customer.full_name ?? 'Unnamed'}
          </p>
          <p className="tnum font-mono text-[0.8rem] text-muted">
            {customer.phone.replace('+92', '0')}
          </p>
        </div>

        <div className="hidden text-center sm:block">
          <p className="tnum font-display text-[0.88rem] font-bold text-ink">
            {customer.total_visits} {customer.total_visits === 1 ? 'visit' : 'visits'}
          </p>
          <p className="text-[0.78rem] text-muted">
            {customer.last_visit_at ? `Last: ${relative(customer.last_visit_at)}` : 'Never been'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            {vip ? <Tag tone="brand">VIP</Tag> : <Tag>Regular</Tag>}
            <p className="tnum mt-1 font-display text-[0.9rem] font-bold text-brand">
              {formatPKR(customer.total_spend)}
            </p>
          </div>
          <ChevronDown className={cn(
            'size-4 flex-none text-faint transition-transform',
            open && 'rotate-180',
          )} />
        </div>
      </button>

      {open && (
        <div className="grid gap-5 border-t border-line px-4 pb-5 pt-5 lg:grid-cols-[300px_1fr]">
          {/* Notes. The reason she'll never leave. */}
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-brand">
              <StickyNote className="size-3" /> Stylist notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => void saveNotes()}
              placeholder="Allergic to ammonia. Prefers Hina. Sensitive scalp."
              rows={5}
              className="w-full rounded-sm border-l-[3px] border-l-brand border-y border-r border-y-line border-r-line bg-white p-3 text-[0.87rem] italic leading-relaxed text-ink placeholder:not-italic placeholder:text-faint focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            />
            {saving && <p className="mt-1.5 text-[0.75rem] text-faint">Saving…</p>}
          </div>

          {/* History */}
          <div>
            <p className="mb-2 font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
              Past appointments
            </p>

            {history === null ? (
              <div className="grid place-items-center py-8 text-faint">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-[0.87rem] text-muted">
                They haven&apos;t been in yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-sm border border-line bg-white">
                <div className="grid grid-cols-[92px_1fr_90px_84px] gap-2 border-b border-line bg-soft/60 px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-faint">
                  <span>Date</span><span>Service</span><span>Stylist</span>
                  <span className="text-right">Price</span>
                </div>
                {history.map(v => (
                  <div key={v.id}
                    className="grid grid-cols-[92px_1fr_90px_84px] items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0">
                    <span className="tnum font-mono text-[0.75rem] text-muted">
                      {v.date ? new Date(v.date).toLocaleDateString('en-GB',
                        { day: '2-digit', month: 'short' }) : '—'}
                    </span>
                    <span className="truncate font-display text-[0.84rem] font-bold text-ink">
                      {v.services.join(', ')}
                    </span>
                    <span className="truncate text-[0.8rem] text-muted">
                      {v.staff_name ?? '—'}
                    </span>
                    <span className="tnum text-right font-mono text-[0.84rem] font-semibold text-ink">
                      {formatPKR(v.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCustomerDialog({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setError(null);
    setBusy(true);

    const res = await fetch('/api/v1/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name || null,
        phone: digitsOnly(phone),
        notes: notes || null,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not add them.'); return; }

    setName(''); setPhone(''); setNotes('');
    setOpen(false);
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus /> Add customer</Button>

      <DialogContent title="Add a customer">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">Name</label>
            <Input autoFocus value={name} placeholder="Sana Malik"
              onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">Phone</label>
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
          </div>

          <div>
            <label className="mb-2 block font-display text-[0.85rem] font-bold">
              Notes <span className="font-normal text-faint">— optional</span>
            </label>
            <textarea
              value={notes} rows={3}
              placeholder="Allergic to ammonia. Prefers Hina."
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-sm border border-line2 bg-white p-3 text-[0.92rem] leading-relaxed text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.86rem] text-red-700">
              <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5">
          <Button block loading={busy} onClick={() => void save()}>Add customer</Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}
