'use client';
import * as React from 'react';
import {
  MessageCircle, Check, Loader2, AlertCircle, X, Clock, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout, Tag } from '@/components/business/panel';
import { formatAsTyped, digitsOnly, isValidPkMobile } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface Settings {
  whatsapp_number: string | null;
  connected: boolean;
  send_24h: boolean;
  send_2h: boolean;
}
interface Stats {
  sent: number; confirmed: number; cancelled: number; no_reply: number;
  confirmed_pct: number; cancelled_pct: number;
}
interface Recent {
  id: string; customer_name: string; start_at: string;
  kind: '24h' | '2h'; status: string;
  reply: 'confirmed' | 'cancelled' | null;
}

/**
 * WHATSAPP REMINDERS.
 *
 * ⚠️  THIS IS NOT A NOTIFICATION SETTING. IT IS THE NO-SHOW DEFENCE.
 *
 * We removed the booking fee. There is now nothing standing between this salon
 * owner and an empty chair on a Saturday except the T-2h message.
 *
 * And that message is not a reminder — it's a QUESTION with a one-tap Cancel
 * button. Someone who cancels at 2pm frees a 4pm slot she can still sell.
 * Someone who just doesn't turn up costs her the chair, the hour, and her
 * trust in the calendar.
 */
export default function RemindersPage() {
  const [s, setS] = React.useState<Settings | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [recent, setRecent] = React.useState<Recent[]>([]);
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/reminders');
    const j = await r.json();
    if (!r.ok) { setError(j.error?.title ?? 'Could not load.'); return; }
    setS(j.data.settings);
    setStats(j.data.stats);
    setRecent(j.data.recent ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);

    const r = await fetch('/api/v1/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setBusy(false);

    if (!r.ok) { setError(j.error?.title ?? 'Could not save.'); return; }
    await load();
  };

  const connect = async () => {
    if (!isValidPkMobile(phone)) {
      setError('That doesn\u2019t look like a Pakistani mobile number.');
      return;
    }
    await patch({ whatsapp_number: `+92${digitsOnly(phone)}` });
    setPhone('');
  };

  if (!s) {
    return <div className="grid place-items-center py-24 text-faint">
      <Loader2 className="size-6 animate-spin" />
    </div>;
  }

  return (
    <div className="w-full">
      <PageHeader
        title="WhatsApp reminders"
        subtitle="The only thing standing between you and an empty chair."
      />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      {!s.connected ? (
        /* ---------------- NOT CONNECTED ---------------- */
        <>
          <Callout className="mb-6">
            <div className="flex flex-wrap items-start gap-5">
              <span className="grid size-12 flex-none place-items-center rounded-lg bg-white text-[#25D366]">
                <MessageCircle className="size-6" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="mb-2 text-[1.2rem]">Not connected yet.</h2>
                <p className="mb-5 max-w-[54ch] text-[0.93rem] leading-relaxed text-muted">
                  Reminders are the single best defence against no-shows.
                  Connect your WhatsApp Business number and we&apos;ll do the rest —
                  automatically, before every appointment.
                </p>

                <div className="flex flex-wrap items-end gap-2.5">
                  <div>
                    <label className="mb-2 block font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] text-faint">
                      Your WhatsApp Business number
                    </label>
                    <div className="flex items-center overflow-hidden rounded-sm border border-line2 bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
                      <span className="flex-none border-r border-line2 bg-soft px-3.5 py-3 font-mono text-[0.9rem] text-ink">
                        +92
                      </span>
                      <input
                        type="tel" inputMode="numeric" maxLength={12}
                        value={formatAsTyped(phone)} placeholder="300 1234567"
                        onChange={(e) => setPhone(e.target.value)}
                        className="tnum w-[160px] border-0 bg-transparent px-3.5 py-3 font-mono text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
                      />
                    </div>
                  </div>

                  <Button loading={busy} onClick={() => void connect()}>
                    Connect WhatsApp
                  </Button>
                </div>

                <p className="mt-3 text-[0.79rem] leading-relaxed text-faint">
                  Approval from Meta takes 5–10 working days. We&apos;ll queue your
                  reminders until it comes through — nothing gets lost.
                </p>
              </div>
            </div>
          </Callout>

          <MessagePreviews />
        </>
      ) : (
        /* ---------------- CONNECTED ---------------- */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ok/30 bg-ok/[.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-ok/15 text-ok">
                <Check className="size-4" strokeWidth={3} />
              </span>
              <div>
                <p className="font-display text-[0.95rem] font-bold text-ink">
                  Connected
                </p>
                <p className="tnum font-mono text-[0.85rem] text-muted">
                  {s.whatsapp_number}
                </p>
              </div>
            </div>

            <button onClick={() => void patch({ whatsapp_number: null })}
              className="font-display text-[0.72rem] font-bold uppercase tracking-wide text-faint transition-colors hover:text-bad">
              Disconnect
            </button>
          </div>

          {/* settings */}
          <Panel header="Reminder settings">
            <ToggleRow
              title="24 hours before"
              subtitle="A friendly confirmation with the time and the landmark."
              hint="Sent the day before"
              on={s.send_24h}
              onToggle={() => void patch({ send_24h: !s.send_24h })}
            />
            <ToggleRow
              title="2 hours before"
              subtitle={'"Still coming?" with Yes / Cancel buttons.'}
              hint="Sent 2 hours before the appointment"
              /* THIS is the one that matters. A cancellation at 2pm is a slot
                 she can still fill. A no-show is an hour she never gets back. */
              important
              on={s.send_2h}
              onToggle={() => void patch({ send_2h: !s.send_2h })}
            />
          </Panel>

          {/* stats */}
          {stats && stats.sent > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Sent this month" value={String(stats.sent)} />
              <Stat label="Confirmed" value={`${stats.confirmed_pct}%`} tone="ok" />
              <Stat
                label="Cancelled early"
                value={`${stats.cancelled_pct}%`}
                tone="brand"
                hint="slots you could refill"
              />
            </div>
          )}

          {/* recent */}
          {recent.length > 0 && (
            <Panel header="Recent">
              {recent.map(r => (
                <div key={r.id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
                  <span className="grid size-9 flex-none place-items-center rounded-full bg-soft font-display text-[0.7rem] font-bold text-muted">
                    {r.customer_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[0.92rem] font-bold text-ink">
                      {r.customer_name}
                    </p>
                    <p className="tnum font-mono text-[0.78rem] text-muted">
                      {r.start_at
                        ? new Date(r.start_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          })
                        : '—'}
                      <span className="ml-2 text-faint">{r.kind} reminder</span>
                    </p>
                  </div>

                  {r.reply === 'confirmed' && <Tag tone="ok">Confirmed</Tag>}
                  {r.reply === 'cancelled' && <Tag tone="brand">Cancelled</Tag>}
                  {!r.reply && r.status === 'skipped_no_provider' && <Tag>Queued</Tag>}
                  {!r.reply && ['sent','delivered','read'].includes(r.status) && <Tag>No reply</Tag>}
                  {r.status === 'failed' && <Tag tone="warn">Failed</Tag>}
                </div>
              ))}
            </Panel>
          )}

          <MessagePreviews />
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */

function ToggleRow({ title, subtitle, hint, on, onToggle, important }: {
  title: string; subtitle: string; hint: string;
  on: boolean; onToggle: () => void; important?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-wrap items-center justify-between gap-4 px-5 py-4',
      important && 'border-l-[3px] border-l-brand bg-brand-tint2/40',
    )}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-display text-[0.98rem] font-bold text-ink">
          {title}
          {important && <Tag tone="brand">The important one</Tag>}
        </p>
        <p className="mt-0.5 text-[0.87rem] leading-relaxed text-muted">{subtitle}</p>
        <p className="tnum mt-1 font-mono text-[0.76rem] text-faint">{hint}</p>
      </div>

      <button
        type="button" role="switch" aria-checked={on}
        onClick={onToggle}
        className={cn(
          'relative h-6 w-11 flex-none rounded-full transition-colors',
          on ? 'bg-brand' : 'bg-line2',
        )}
      >
        <span className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-[22px]' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  );
}

function Stat({ label, value, tone, hint }: {
  label: string; value: string; tone?: 'ok' | 'brand'; hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.1em] text-faint">
        {label}
      </p>
      <p className={cn(
        'tnum mt-2 font-display text-[1.6rem] font-extrabold leading-none tracking-tight',
        tone === 'ok' ? 'text-ok' : tone === 'brand' ? 'text-brand' : 'text-ink',
      )}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[0.74rem] text-muted">{hint}</p>}
    </div>
  );
}

/** What her customers will actually receive. */
function MessagePreviews() {
  return (
    <div className="rounded-lg border border-line bg-white p-6">
      <h2 className="mb-1.5 text-[1.1rem]">What we&apos;ll send</h2>
      <p className="mb-6 text-[0.88rem] text-muted">
        Your customers see these on WhatsApp, from your number.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Preview
          label="24 hours before"
          icon={<Clock className="size-3.5" />}
          body={`Hi Sana — you're booked at Glow Salon tomorrow at 4:00 PM.

Haircut, Blow Dry with Hina

📍 Opposite Emporium Mall, near KFC

See you then!`}
        />

        <Preview
          label="2 hours before"
          icon={<Zap className="size-3.5" />}
          important
          body="Hi Sana — still coming at 4:00 PM today?"
          buttons={['Yes, I\u2019ll be there', 'I need to cancel']}
        />
      </div>

      {/* The single sentence that explains why this feature exists. */}
      <p className="mt-6 rounded-lg border border-line bg-soft p-4 text-[0.86rem] leading-relaxed text-muted">
        <b className="font-display font-bold text-ink">
          The 2-hour message is the important one.
        </b>{' '}
        A customer who cancels at 2pm frees a slot you can still fill. One who
        just doesn&apos;t turn up costs you the chair.
      </p>
    </div>
  );
}

function Preview({ label, icon, body, buttons, important }: {
  label: string; icon: React.ReactNode; body: string;
  buttons?: string[]; important?: boolean;
}) {
  return (
    <div>
      <p className={cn(
        'mb-2.5 inline-flex items-center gap-1.5 font-display text-[0.66rem] font-bold uppercase tracking-[0.1em]',
        important ? 'text-brand' : 'text-faint',
      )}>
        {icon} {label}
      </p>

      <div className="rounded-lg bg-[#ECE5DD] p-4">
        <div className="max-w-full rounded-lg rounded-tl-none bg-[#DCF8C6] p-3 shadow-sm">
          <p className="whitespace-pre-line text-[0.85rem] leading-relaxed text-[#111B21]">
            {body}
          </p>

          {buttons && (
            <div className="mt-3 space-y-1.5 border-t border-black/[.07] pt-2.5">
              {buttons.map(b => (
                <div key={b}
                  className="rounded bg-white/70 py-2 text-center font-display text-[0.8rem] font-semibold text-[#008069]">
                  {b}
                </div>
              ))}
            </div>
          )}

          <p className="tnum mt-1.5 text-right font-mono text-[0.62rem] text-[#667781]">
            13:58
          </p>
        </div>
      </div>
    </div>
  );
}
