import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'NearAppoint is early and small, building from Lahore. We’re not running formal openings yet — but if you want in at the ground floor, here’s how to reach us.',
};

const interests = [
  ['Engineering', 'Next.js, Postgres, and the kind of backend work where a double-booking is never allowed to happen.'],
  ['Sales & onboarding', 'Sitting with salon owners in Lahore, understanding their day, and getting them live.'],
  ['Design', 'Making a tool a busy salon owner can run for eight hours without it fighting her.'],
  ['Support', 'Being the real person in Lahore who answers when something breaks.'],
];

export default function CareersPage() {
  return (
    <>
      <header className="border-b border-line bg-brand-tint2">
        <div className="container py-14 md:py-16">
          <p className="mb-3 font-display text-[0.74rem] font-bold uppercase tracking-[0.14em] text-brand">
            Careers
          </p>
          <h1 className="text-[clamp(2rem,4vw,2.9rem)] max-w-[18ch]">Build the ground floor with us.</h1>
          <p className="mt-5 max-w-[58ch] text-[1.02rem] leading-relaxed text-muted">
            We&apos;ll be honest, because pretending otherwise would waste your time: NearAppoint is
            early. We&apos;re a small team in Lahore building Pakistan&apos;s appointment marketplace
            from the first salon up. We don&apos;t have a careers portal full of open roles yet.
          </p>
        </div>
      </header>

      <div className="container py-14">
        <div className="max-w-[68ch]">
          <p className="text-[1.05rem] leading-relaxed text-muted">
            What we do have is a hard, real problem and a lot of it left to build. If you&apos;re the
            kind of person who&apos;d rather shape something from the start than slot into something
            finished, we want to hear from you before we&apos;re formally hiring.
          </p>

          <h2 className="mt-11 text-[1.35rem]">The kinds of people we&apos;ll need first</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {interests.map(([role, blurb]) => (
              <div key={role} className="rounded border border-line bg-white p-5">
                <h3 className="font-display text-[1.02rem] font-bold text-ink">{role}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{blurb}</p>
              </div>
            ))}
          </div>

          <div className="mt-11 rounded-lg border border-line bg-soft p-7">
            <h2 className="text-[1.25rem]">How to reach us</h2>
            <p className="mt-2.5 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
              Send us a note about what you&apos;d want to work on and a link to something
              you&apos;ve made. No cover letter theatre — just tell us what you&apos;re good at.
            </p>
            <a
              href="mailto:careers@nearappoint.com"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-display text-[0.92rem] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              careers@nearappoint.com <ArrowRight className="size-4" />
            </a>
          </div>

          <p className="mt-8 text-[0.9rem] text-muted">
            Not looking to join, but want to use NearAppoint for your salon?{' '}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              Start your free trial
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
