'use client';
import * as React from 'react';
import {
  Search, MapPin, Loader2, Scissors, Sparkles, Hand, Flower2, Leaf, Sparkle,
} from 'lucide-react';
import { BusinessCard, type BusinessCardData } from '@/components/customer/business-card';
import { cn } from '@/lib/utils';

/** The six niches, in order. Hair Salons and Beauty Parlors are live. */
const CATEGORIES = [
  { slug: 'hair_salon',       name: 'Hair Salons',       icon: Scissors },
  { slug: 'beauty_parlor',    name: 'Beauty Parlors',    icon: Sparkles },
  { slug: 'nail_studio',      name: 'Nail Studios',      icon: Hand,        soon: true },
  { slug: 'mehndi_studio',    name: 'Mehndi Studios',    icon: Flower2,     soon: true },
  { slug: 'wellness',         name: 'Wellness Centers',  icon: Leaf,        soon: true },
  { slug: 'aesthetic_clinic', name: 'Aesthetic Clinics', icon: Sparkle,     soon: true },
];

export default function CustomerHome() {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<BusinessCardData[] | null>(null);
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  /**
   * Location is asked for when she first touches the search box — NOT on load.
   *
   * Asked in context, at the moment the benefit is obvious, acceptance is
   * several times higher. Asking on arrival is how you permanently lose the
   * permission, and you only get one chance at it.
   */
  const askLocation = React.useCallback(() => {
    if (coords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { /* she said no. We just won't show distances. */ },
      { timeout: 6000 },
    );
  }, [coords]);

  const search = React.useCallback(async () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (cat) p.set('category', cat);
    if (coords) { p.set('lat', String(coords.lat)); p.set('lng', String(coords.lng)); }

    const r = await fetch(`/api/v1/public/search?${p}`);
    const j = await r.json();
    setResults(j.data ?? []);
  }, [q, cat, coords]);

  React.useEffect(() => {
    const t = setTimeout(() => void search(), 220);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="container py-14 lg:py-20">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-low px-3.5 py-1.5 font-display text-[0.78rem] font-bold text-brand">
        <MapPin className="size-3.5" /> Lahore
      </span>

      <h1 className="my-5 max-w-[14ch] font-display text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-warm-ink">
        Find and book{' '}
        <span className="text-brand">near you.</span>
      </h1>

      <p className="mb-9 max-w-[46ch] text-[1.05rem] leading-relaxed text-warm-muted">
        Real availability. Real prices. No phone calls.
      </p>

      {/* search */}
      <div className="mb-7 flex max-w-[640px] items-center gap-3 rounded-full border border-warm-line bg-white px-5 py-4 shadow-[0_2px_12px_rgba(88,66,55,.05)] transition-all focus-within:border-brand focus-within:shadow-[0_4px_20px_rgba(249,115,22,.12)]">
        <Search className="size-5 flex-none text-warm-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={askLocation}
          placeholder="Search salons, parlors, or a service…"
          className="min-w-0 flex-1 border-0 bg-transparent text-[1rem] text-warm-ink placeholder:text-warm-faint focus:outline-none"
        />
        <span className="hidden flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-warm-low px-3.5 py-2 text-[0.78rem] font-semibold text-warm-muted sm:flex">
          <MapPin className="size-3.5" /> Lahore
        </span>
      </div>

      {/* categories */}
      <div className="mb-12 flex flex-wrap gap-2.5">
        {CATEGORIES.map(({ slug, name, icon: Icon, soon }) => (
          <button
            key={slug}
            disabled={soon}
            onClick={() => setCat(cat === slug ? null : slug)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[0.9rem] transition-all',
              cat === slug
                ? 'border-brand bg-brand font-semibold text-white shadow-brand'
                : soon
                  ? 'cursor-default border-warm-line/60 bg-white/60 text-warm-faint'
                  : 'border-warm-line bg-white text-warm-ink hover:border-brand hover:text-brand',
            )}
          >
            <Icon className="size-4" />
            {name}
            {soon && (
              <span className="rounded-full bg-warm-low px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* results */}
      {results === null ? (
        <div className="grid place-items-center py-24 text-warm-faint">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        /* An empty state with no next action is a bug. */
        <div className="rounded-[20px] border border-warm-line/60 bg-white p-12 text-center">
          <h2 className="mb-3 font-display text-[1.5rem] font-extrabold tracking-tight text-warm-ink">
            {q || cat ? 'Nothing matched that.' : 'We\u2019re just getting started in Lahore.'}
          </h2>
          <p className="mx-auto max-w-[46ch] text-[0.98rem] leading-relaxed text-warm-muted">
            {q || cat
              ? 'Try a different search, or clear the filters to see everyone.'
              : 'We\u2019re onboarding our first salons in person, one at a time \u2014 so that when you book a 6pm slot, it\u2019s really there.'}
          </p>
          {(q || cat) && (
            <button onClick={() => { setQ(''); setCat(null); }}
              className="mt-6 font-display text-[0.92rem] font-bold text-brand hover:underline">
              Show everyone
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-6 text-[0.92rem] text-warm-muted">
            <b className="tnum font-display font-bold text-warm-ink">{results.length}</b>
            {' '}{results.length === 1 ? 'place' : 'places'}
            {coords ? ' near you' : ' in Lahore'}
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(b => <BusinessCard key={b.slug} b={b} />)}
          </div>
        </>
      )}
    </div>
  );
}
