import type { Metadata } from 'next';
import Link from 'next/link';
import { Smartphone, Share, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mobile App',
  description:
    'NearAppoint works today in any phone browser — and installs to your home screen like an app. Native iOS and Android apps are on the way.',
};

const steps = [
  { icon: Share, title: 'Open the menu', text: 'In your phone browser, open nearappoint.com and tap the Share button (iPhone) or the ⋮ menu (Android).' },
  { icon: Plus, title: 'Add to Home Screen', text: 'Choose “Add to Home Screen.” NearAppoint gets its own icon, just like a downloaded app.' },
  { icon: Smartphone, title: 'Open it anytime', text: 'Tap the icon to book, manage appointments, and get reminders — no app store needed.' },
];

export default function MobilePage() {
  return (
    <>
      <header className="border-b border-line bg-brand-tint2">
        <div className="container py-14 md:py-16">
          <p className="mb-3 font-display text-[0.74rem] font-bold uppercase tracking-[0.14em] text-brand">
            Mobile
          </p>
          <h1 className="text-[clamp(2rem,4vw,2.9rem)] max-w-[20ch]">
            NearAppoint is already on your phone.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[1.02rem] leading-relaxed text-muted">
            You don&apos;t need to wait for an app store. NearAppoint runs in any phone browser today,
            and installs to your home screen with its own icon. Dedicated iOS and Android apps are on
            the way — and if you install the web version now, you&apos;re already set up.
          </p>
        </div>
      </header>

      <div className="container py-14">
        <div className="max-w-[68ch]">
          <h2 className="text-[1.35rem]">Install it in three taps</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="rounded border border-line bg-white p-5">
                <div className="flex size-9 items-center justify-center rounded-sm bg-brand-tint text-brand">
                  <Icon className="size-5" />
                </div>
                <p className="mt-3 font-mono text-[0.78rem] text-faint">Step {i + 1}</p>
                <h3 className="mt-0.5 font-display text-[1rem] font-bold text-ink">{title}</h3>
                <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-11 rounded-lg border border-line bg-soft p-7">
            <h2 className="text-[1.25rem]">Want to know when the apps land?</h2>
            <p className="mt-2.5 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
              We&apos;ll let you know the moment the native iOS and Android apps are ready. For now,
              the fastest way in is the web app.
            </p>
            <Link
              href="/home"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-display text-[0.92rem] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Open NearAppoint
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
