'use client';
import * as React from 'react';
import Image from 'next/image';
import {
  Camera, Trash2, Loader2, Check, AlertCircle, Store, MapPin, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/business/page-header';
import { Panel, Callout } from '@/components/business/panel';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';
import { cn } from '@/lib/utils';

interface Profile {
  display_name: string;
  description: string | null;
  cover_url: string | null;
  category: string;
  branch: {
    id: string; phone: string; whatsapp: string | null;
    address_line: string; landmark: string | null;
    area: string | null; city: string;
    gender_policy: 'women_only' | 'men_only' | 'unisex';
  };
  photos: { id: string; url: string; display_order: number }[];
  is_listed: boolean;
  missing: string[];
}

/**
 * BUSINESS PROFILE.
 *
 * She cannot be shown to customers until this is complete. A search result with
 * no photos, no landmark and no description is worse than no search result at
 * all — the customer taps it, learns nothing, and stops trusting the app. One
 * bad first impression is expensive, and we only get a few.
 *
 * Photos upload STRAIGHT to Supabase Storage from the browser. We never proxy
 * image bytes through a serverless function — it's slow and there's a payload
 * limit that a phone photo will blow past.
 */
export default function ProfilePage() {
  const [p, setP] = React.useState<Profile | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/v1/profile');
    const j = await r.json();
    setP(j.data);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);

    const res = await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) { setError(json.error?.title ?? 'Could not save.'); return; }

    setP(json.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const upload = async (file: File, kind: 'cover' | 'gallery') => {
    setUploading(true);
    setError(null);

    const supabase = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('business-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (upErr) {
      setUploading(false);
      setError(
        upErr.message.includes('not found')
          ? 'The "business-photos" storage bucket doesn\u2019t exist yet. Create it in Supabase → Storage.'
          : upErr.message,
      );
      return;
    }

    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-photos/${path}`;

    if (kind === 'cover') {
      await save({ cover_url: url });
    } else {
      await fetch('/api/v1/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path: path }),
      });
      await load();
    }

    setUploading(false);
  };

  const removePhoto = async (id: string) => {
    await fetch(`/api/v1/photos/${id}`, { method: 'DELETE' });
    await load();
  };

  if (!p) {
    return <div className="grid place-items-center py-24 text-faint"><Loader2 className="size-6 animate-spin" /></div>;
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Business profile"
        subtitle="What customers see when they find you."
        actions={saved ? (
          <span className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-ok">
            <Check className="size-4" strokeWidth={3} /> Saved
          </span>
        ) : undefined}
      />

      {/* What she still needs before customers can see her. Honest, specific. */}
      {p.missing.length > 0 && (
        <Callout className="mb-6">
          <div className="flex items-start gap-4">
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-white text-brand">
              <Store className="size-5" />
            </span>
            <div>
              <h2 className="mb-1.5 text-[1.1rem]">
                A few things before customers can find you.
              </h2>
              <p className="mb-3 max-w-[52ch] text-[0.9rem] leading-relaxed text-muted">
                A listing with no photos and no landmark is worse than no listing —
                someone taps it, learns nothing, and doesn&apos;t come back.
              </p>
              <ul className="space-y-1">
                {p.missing.map(m => (
                  <li key={m} className="flex items-center gap-2 text-[0.88rem] text-ink">
                    <span className="size-1.5 rounded-full bg-brand" /> {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Callout>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] leading-relaxed text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" /> {error}
        </div>
      )}

      {/* ---- cover ---- */}
      <div className="relative mb-6 h-[200px] overflow-hidden rounded-lg border border-line bg-soft">
        {p.cover_url && (
          <Image src={p.cover_url} alt="" fill className="object-cover" unoptimized />
        )}
        <div className="absolute inset-0 grid place-items-center bg-navy/35">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, 'cover'); }} />
            <span className="inline-flex items-center gap-2 rounded-sm bg-white px-4 py-2.5 font-display text-[0.88rem] font-bold text-ink shadow">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {p.cover_url ? 'Change cover' : 'Upload cover'}
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        {/* ---- basics ---- */}
        <Panel>
          <Field label="Business name" value={p.display_name}
            onSave={(v) => save({ display_name: v })} />

          <div className="p-4">
            <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
              Description
            </label>
            <textarea
              defaultValue={p.description ?? ''}
              rows={3}
              placeholder="A family-run ladies' salon in Johar Town. Specialists in bridal and colour."
              onBlur={(e) => save({ description: e.target.value })}
              className="w-full rounded-sm border border-line2 bg-white p-3 text-[0.92rem] leading-relaxed text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            />
          </div>

          <Field label="Phone" value={p.branch.phone} mono
            onSave={(v) => save({ phone: v })} />
          <Field label="WhatsApp" value={p.branch.whatsapp ?? ''} mono
            placeholder="Same as phone"
            onSave={(v) => save({ whatsapp: v })} />
        </Panel>

        {/* ---- address ---- */}
        <div>
          <p className="mb-2.5 px-1 font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-faint">
            Where you are
          </p>
          <Panel>
            <Field label="Street address" value={p.branch.address_line}
              onSave={(v) => save({ address_line: v })} />

            {/* THE LANDMARK. "House 42, Street 7, Block C" will not get a customer
                to her door in Lahore. "Opposite Emporium Mall, near the KFC" will.
                This is not a nice-to-have field. */}
            <div className="border-l-[3px] border-l-brand bg-brand-tint2/40 p-4">
              <label className="mb-2 flex items-center gap-1.5 font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-brand">
                <MapPin className="size-3" /> Landmark
              </label>
              <Input
                defaultValue={p.branch.landmark ?? ''}
                placeholder="Opposite Emporium Mall, near KFC"
                onBlur={(e) => save({ landmark: e.target.value })}
              />
              <p className="mt-2 text-[0.79rem] leading-relaxed text-muted">
                Street addresses don&apos;t get customers to your door in Lahore.
                Landmarks do. This is the first thing they&apos;ll see.
              </p>
            </div>

            <Field label="Area" value={p.branch.area ?? ''} placeholder="Johar Town"
              onSave={(v) => save({ area: v })} />
            <Field label="City" value={p.branch.city}
              onSave={(v) => save({ city: v })} />

            <div className="p-4">
              <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
                Who can come?
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  ['women_only', 'Women only'],
                  ['men_only', 'Men only'],
                  ['unisex', 'Everyone'],
                ] as const).map(([v, label]) => (
                  <button key={v} type="button"
                    onClick={() => save({ gender_policy: v })}
                    className={cn(
                      'rounded-sm border px-4 py-2.5 font-display text-[0.88rem] transition-all',
                      p.branch.gender_policy === v
                        ? 'border-brand bg-brand-tint font-semibold text-ink'
                        : 'border-line2 bg-white text-muted hover:border-faint',
                    )}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[0.79rem] leading-relaxed text-muted">
                A women-only salon will never appear in a male customer&apos;s search.
                We take this seriously.
              </p>
            </div>
          </Panel>
        </div>

        {/* ---- gallery ---- */}
        <div>
          <p className="mb-2.5 px-1 font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-faint">
            Gallery · {p.photos.length} {p.photos.length === 1 ? 'photo' : 'photos'}
          </p>
          <Panel>
            <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4">
              {p.photos.map(ph => (
                <div key={ph.id}
                  className="group relative aspect-square overflow-hidden rounded-sm border border-line bg-soft">
                  <Image src={ph.url} alt="" fill className="object-cover" unoptimized />
                  <button onClick={() => void removePhoto(ph.id)}
                    className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-sm bg-white/95 text-bad opacity-0 shadow transition-opacity group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}

              <label className="grid aspect-square cursor-pointer place-items-center rounded-sm border-2 border-dashed border-line2 text-faint transition-colors hover:border-brand hover:text-brand">
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, 'gallery'); }} />
                {uploading ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-6" />}
              </label>
            </div>
          </Panel>
        </div>
      </div>

      {saving && (
        <p className="mt-4 text-center text-[0.82rem] text-faint">Saving…</p>
      )}
    </div>
  );
}

function Field({ label, value, onSave, mono, placeholder }: {
  label: string; value: string; onSave: (v: string) => void;
  mono?: boolean; placeholder?: string;
}) {
  return (
    <div className="p-4">
      <label className="mb-2 block font-display text-[0.72rem] font-bold uppercase tracking-[0.08em] text-faint">
        {label}
      </label>
      <Input
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => { if (e.target.value !== value) onSave(e.target.value); }}
        className={mono ? 'font-mono tnum' : undefined}
      />
    </div>
  );
}
