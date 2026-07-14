import { Search, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';

export const metadata = { title: 'Find a business near you' };

/**
 * CUSTOMER HOME.
 *
 * We have no listed businesses yet. Rather than show an empty grid or invent
 * fake ones, we say so, plainly, and offer the one honest next action.
 *
 * An empty state without a next action is a bug. An empty state that LIES is
 * worse — the first customer who books a business that doesn't exist is the
 * last customer we get from her.
 */
export default function CustomerHome() {
  const categories = [
    { name: 'Hair Salons',    desc: 'Cuts, colour, styling, beard & grooming' },
    { name: 'Beauty Parlors', desc: 'Makeup, facials, threading, waxing & bridal' },
    { name: 'Nail Studios',   desc: 'Manicure, pedicure, gel & nail art', soon: true },
    { name: 'Mehndi Studios', desc: 'Bridal, party & occasion mehndi', soon: true },
    { name: 'Wellness',       desc: 'Spa, massage, therapy & relaxation', soon: true },
    { name: 'Aesthetic Clinics', desc: 'Skin treatments & consultations', soon: true },
  ];

  return (
    <div className="container py-14">
      <Pill>Lahore</Pill>
      <h1 className="my-4 max-w-[16ch]">
        Find and book <span className="text-brand">near you.</span>
      </h1>
      <p className="mb-9 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted">
        Real availability. Real prices. No phone calls.
      </p>

      {/* Search — not wired yet. Disabled honestly rather than faked. */}
      <div className="mb-12 flex max-w-[560px] items-center gap-2.5 rounded border border-line2 bg-white px-4 py-3.5 text-muted">
        <Search className="size-[18px] flex-none text-faint" />
        <span className="text-[0.95rem]">Search businesses and services…</span>
        <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap rounded-full bg-soft px-2.5 py-1 text-[0.72rem] font-semibold text-faint">
          <MapPin className="size-3" /> Lahore
        </span>
      </div>

      {/* The honest empty state. */}
      <div className="mb-12 rounded-lg border border-line bg-soft p-8 text-center">
        <h2 className="mb-2.5 text-[1.4rem]">We&apos;re just getting started in Lahore.</h2>
        <p className="mx-auto max-w-[46ch] text-[0.95rem] leading-relaxed text-muted">
          We&apos;re onboarding our first businesses right now — in person, one at a
          time, so that when you book a 6pm slot, it&apos;s really there.
          <br /><br />
          You&apos;ll be able to book here shortly.
        </p>
      </div>

      <h2 className="mb-6 text-[1.5rem]">What you&apos;ll be able to book</h2>
      <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.name} className={c.soon ? 'opacity-55' : ''}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3>{c.name}</h3>
              {c.soon && (
                <span className="whitespace-nowrap rounded bg-soft px-2 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-faint">
                  Soon
                </span>
              )}
            </div>
            <p className="text-[0.85rem] leading-relaxed text-muted">{c.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
