import { Check } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Pill } from '@/components/ui/pill';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1fr_42%]">
      <main className="flex flex-col bg-white px-6 pb-9 pt-7">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </main>

      <aside className="relative hidden flex-col justify-center overflow-hidden bg-navy p-12 lg:flex">
        <div
          className="pointer-events-none absolute -bottom-44 -right-40 size-[460px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,.22), transparent 68%)' }}
        />
        <div className="relative">
          <Pill onDark>NearAppoint for Salons</Pill>
          <p className="my-6 max-w-[14ch] font-display text-[1.9rem] font-extrabold leading-tight tracking-tight text-white">
            Your whole day, on <span className="text-brand">one screen.</span>
          </p>
          <div className="flex flex-col gap-3.5">
            {[
              'Walk-ins entered in ten seconds — even when the internet is down.',
              'The same slot can never be booked twice. Not "we check" — it cannot happen.',
              'WhatsApp reminders that ask "still coming?" — while you can still fill the slot.',
            ].map((t) => (
              <div key={t} className="flex items-start gap-3 text-[0.94rem] leading-snug text-white/70">
                <Check className="mt-0.5 size-[17px] flex-none text-brand" strokeWidth={2.6} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
