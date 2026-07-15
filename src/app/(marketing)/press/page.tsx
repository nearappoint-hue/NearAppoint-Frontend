import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Press',
  description:
    'Media enquiries and the facts about NearAppoint — Pakistan’s appointment marketplace and business operating system, built in Lahore.',
};

const facts = [
  ['What it is', 'An appointment booking marketplace and business operating system for service businesses in Pakistan.'],
  ['Who it’s for', 'Hair salons, beauty parlours, nail studios, wellness centres, mehndi studios, and aesthetic clinics — and the customers who book them.'],
  ['Where', 'Built in Lahore, launching in Lahore first.'],
  ['Operated by', 'Axiom Fintech Solutions.'],
  ['How it makes money', 'Subscriptions for businesses, not commission on bookings. Customers pay no booking fee.'],
  ['The promise', 'Two customers can never be booked into the same slot — a guarantee enforced in the database, not just the app.'],
];

export default function PressPage() {
  return (
    <>
      <header className="border-b border-line bg-brand-tint2">
        <div className="container py-14 md:py-16">
          <p className="mb-3 font-display text-[0.74rem] font-bold uppercase tracking-[0.14em] text-brand">
            Press
          </p>
          <h1 className="text-[clamp(2rem,4vw,2.9rem)] max-w-[20ch]">
            The facts, and a real person to talk to.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[1.02rem] leading-relaxed text-muted">
            NearAppoint is early-stage and building in public. If you&apos;re writing about local
            tech, small-business software, or Pakistan&apos;s services economy, here&apos;s what
            you need — and how to reach us.
          </p>
        </div>
      </header>

      <div className="container py-14">
        <div className="max-w-[68ch]">
          <h2 className="text-[1.35rem]">The one-paragraph version</h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">
            NearAppoint is a Lahore-built platform that lets people find and book appointments at
            local salons, clinics, and wellness businesses in seconds — and gives those businesses
            the calendar, staff, and customer tools to run their day. It launches with six
            categories in Lahore, earns through subscriptions rather than commission, and is
            operated by Axiom Fintech Solutions.
          </p>

          <h2 className="mt-11 text-[1.35rem]">Fact sheet</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {facts.map(([term, def]) => (
              <div key={term} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                <dt className="font-display text-[0.9rem] font-bold text-ink">{term}</dt>
                <dd className="text-[0.95rem] leading-relaxed text-muted">{def}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-11 rounded-lg border border-line bg-soft p-7">
            <h2 className="text-[1.25rem]">Media enquiries</h2>
            <p className="mt-2.5 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
              For interviews, quotes, logos, or product screenshots, email us and we&apos;ll get
              back to you quickly.
            </p>
            <a
              href="mailto:press@nearappoint.com"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-display text-[0.92rem] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              press@nearappoint.com <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
