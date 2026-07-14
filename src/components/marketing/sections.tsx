'use client';
import Link from 'next/link';
import { ArrowRight, Check, Apple, Play, User, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { SectionHead } from '@/components/ui/section-head';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SITE } from '@/config/site';
import {
  CATEGORIES, STEPS, FEATURES, BUSINESS_FEATURES,
  CUSTOMER_BENEFITS, BUSINESS_BENEFITS, FAQS, TESTIMONIALS,
} from '@/constants/marketing';

/* ---------------------------------------------------------------- StatsBar */
export function StatsBar() {
  if (!SITE.showStats) return null;
  const items = [
    [SITE.stats.businesses, 'Businesses Listed'],
    [SITE.stats.customers, 'Happy Customers'],
    [SITE.stats.appointments, 'Appointments Booked'],
    [`${SITE.stats.rating}★`, 'Average Rating'],
  ] as const;

  return (
    <section className="border-y border-line bg-soft py-10">
      <div className="container">
        <p className="mb-6 text-center font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-faint">
          Trusted Across Pakistan
        </p>
        <div className="mb-6 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {items.map(([n, l]) => (
            <div key={l}>
              <div className="tnum font-display text-[1.6rem] font-extrabold tracking-tight">{n}</div>
              <div className="mt-0.5 text-[0.78rem] text-muted">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {SITE.cities.map((c) => (
            <span key={c} className="text-[0.78rem] text-faint">◉ {c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Categories */
export function Categories() {
  return (
    <section id="categories" className="py-[84px]">
      <div className="container">
        <SectionHead
          pill="Categories"
          title="Find Every Service You Need"
          subtitle="From a fresh cut to bridal mehndi, NearAppoint connects you with vetted businesses across six categories \u2014 with real prices and real availability."
        />
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, name, desc }) => (
            <Card key={name} interactive>
              <span className="grid size-9 place-items-center rounded-sm bg-brand-tint text-brand">
                <Icon className="size-[17px]" />
              </span>
              <h3 className="mb-1.5 mt-3">{name}</h3>
              <p className="text-[0.85rem] leading-relaxed text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- Steps */
export function Steps() {
  return (
    <section className="bg-navy py-[84px]">
      <div className="container">
        <SectionHead
          onDark
          pill="How It Works"
          title="Three Steps to Your Perfect Appointment"
          subtitle="We've removed every friction point. From discovery to arrival, the entire journey takes less than 60 seconds."
        />
        <div className="grid gap-[18px] lg:grid-cols-3">
          {STEPS.map(({ n, icon: Icon, title, kicker, desc }) => (
            <div key={n} className="relative overflow-hidden rounded-lg border border-navy-line bg-navy-soft p-[26px]">
              <span className="absolute -right-1 top-8 size-2.5 rounded-full bg-brand" />
              <div className="mb-5 flex items-center justify-between">
                <span className="font-display text-[2.6rem] font-extrabold leading-none tracking-tighter text-white/10">{n}</span>
                <span className="grid size-[34px] place-items-center rounded-sm bg-white/[.08] text-white">
                  <Icon className="size-4" />
                </span>
              </div>
              <h3 className="mb-1 text-lg text-white">{title}</h3>
              <p className="mb-3 font-display text-[0.8rem] font-bold text-brand">{kicker}</p>
              <p className="text-[0.87rem] leading-relaxed text-white/55">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Features */
export function Features() {
  return (
    <section id="features" className="py-[84px]">
      <div className="container">
        <SectionHead
          pill="Features"
          title="Everything You Need to Book Better"
          subtitle="NearAppoint packs every tool customers need to discover, trust, and book local services without friction."
        />
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} interactive>
              <span className="mb-3.5 grid size-9 place-items-center rounded-sm bg-brand-tint text-brand">
                <Icon className="size-[17px]" />
              </span>
              <h3 className="mb-1.5">{title}</h3>
              <p className="text-[0.85rem] leading-relaxed text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- For Businesses + dashboard */
export function ForBusiness() {
  return (
    <section id="business" className="bg-gradient-to-b from-[#FFF8F2] to-[#FFFDFB] py-[84px]">
      <div className="container grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Pill>For Business Owners</Pill>
          <h2 className="my-[18px]">
            Your Business, Fully<br /><span className="text-brand">Digitized.</span>
          </h2>
          <p className="mb-7 max-w-[46ch] text-[0.97rem] leading-relaxed text-muted">
            NearAppoint is more than a listing. It&apos;s a complete operating system for beauty
            and wellness businesses — handling everything from bookings to payroll reports.
          </p>

          <div className="mb-7 grid gap-5 sm:grid-cols-2">
            {BUSINESS_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-[17px] flex-none text-brand" />
                <div>
                  <b className="mb-0.5 block font-display text-[0.88rem] font-bold">{title}</b>
                  <span className="text-[0.78rem] leading-snug text-muted">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <Button asChild size="lg">
            <Link href="/signup">Register Your Business <ArrowRight /></Link>
          </Button>
        </div>

        <DashboardMock />
      </div>
    </section>
  );
}

function DashboardMock() {
  const appts = [
    { t: '11:00 AM', n: 'Fatima K.', s: 'Hair Color · Nadia', st: 'Confirmed' },
    { t: '12:30 PM', n: 'Sana R.', s: 'Facial · Ayesha', st: 'Confirmed' },
    { t: '2:00 PM', n: 'Maria H.', s: 'Threading · Hina', st: 'Pending' },
  ];
  const bars = [42, 58, 48, 70, 62, 100, 54];

  return (
    <div className="rounded-lg bg-navy p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <b className="block font-display text-[0.88rem] font-bold text-white">Business Dashboard</b>
          <small className="text-[0.68rem] text-white/40">Glow Studio, Lahore</small>
        </div>
        <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-emerald-400">
          <i className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[['Today\'s Bookings', '14', '↑12%'], ['Revenue Today', 'Rs 32,400', '↑8%'], ['Staff On Duty', '4/5', '']].map(([l, v, d]) => (
          <div key={l} className="rounded-sm border border-navy-line bg-navy-soft p-3">
            <small className="mb-1 block text-[0.58rem] text-white/40">{l}</small>
            <b className="tnum font-display text-[1.05rem] font-extrabold text-white">{v}</b>
            {d && <i className="ml-1 text-[0.55rem] not-italic text-emerald-400">{d}</i>}
          </div>
        ))}
      </div>

      <p className="mb-2 font-display text-[0.66rem] font-bold text-white/55">Upcoming Appointments</p>
      {appts.map((a) => (
        <div key={a.t} className="mb-1.5 flex items-center gap-2.5 rounded-lg bg-navy-soft px-2.5 py-2">
          <span className="tnum w-11 flex-none font-mono text-[0.58rem] text-white/45">{a.t}</span>
          <div>
            <b className="block font-display text-[0.68rem] font-bold text-white">{a.n}</b>
            <small className="text-[0.55rem] text-white/40">{a.s}</small>
          </div>
          <span className={`ml-auto rounded px-2 py-0.5 font-display text-[0.5rem] font-bold ${
            a.st === 'Confirmed' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-brand/20 text-brand-light'
          }`}>
            {a.st}
          </span>
        </div>
      ))}

      <p className="mb-2 mt-4 font-display text-[0.66rem] font-bold text-white/55">Weekly Revenue</p>
      <div className="flex h-14 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} style={{ height: `${h}%` }}
            className={`flex-1 rounded-t ${h === 100 ? 'bg-brand' : 'bg-[#3D4E6B]'}`} />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="flex-1 text-center text-[0.48rem] text-white/30">{d}</span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Mobile App */
// Typed properly instead of a tuple + @ts-expect-error. A suppressed type error
// is a bug you have agreed to be surprised by later.
const STORES = [
  { icon: Apple, small: 'Download on the', big: 'App Store' },
  { icon: Play,  small: 'Get it on',       big: 'Google Play' },
] as const;

export function MobileApp() {
  return (
    <section className="bg-navy py-[84px]">
      <div className="container">
        <SectionHead
          onDark
          pill="Mobile App"
          title="Your City's Services, In Your Pocket"
          subtitle="Available on iOS and Android. Download once, book forever — with offline support, smart reminders, and a beautiful interface."
        />
        <div className="mb-11 flex flex-wrap justify-center gap-3">
          {STORES.map(({ icon: Icon, small, big }) => (
            <a key={big} href="#"
              className="inline-flex items-center gap-2.5 rounded-sm border border-navy-line bg-navy-soft px-[18px] py-2.5 text-white transition-colors hover:border-white/30">
              <Icon className="size-[19px]" />
              <span>
                <small className="block text-[0.56rem] leading-tight text-white/50">{small}</small>
                <b className="block font-display text-[0.84rem] font-bold leading-tight">{big}</b>
              </span>
            </a>
          ))}
        </div>
        <TrioMock />
      </div>
    </section>
  );
}

function TrioMock() {
  const slots = ['11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00'];
  return (
    <div className="flex items-end justify-center gap-3.5">
      <div className="hidden w-[130px] scale-90 rounded-2xl bg-[#C9D2DE] p-2 opacity-45 shadow-lg sm:block">
        <div className="min-h-[150px] rounded-xl bg-soft p-2.5">
          {['◉ Lahore', 'Hair Salons', 'Beauty Parlors', 'Nail Studios', 'Mehndi Studios'].map((r) => (
            <div key={r} className="py-1 text-[0.5rem] text-muted">{r}</div>
          ))}
        </div>
      </div>

      <div className="z-10 w-[150px] rounded-2xl bg-white p-2 shadow-lg">
        <div className="min-h-[150px] rounded-xl bg-soft p-2.5">
          <div className="mb-2 rounded-[7px] bg-brand px-2 py-1.5 text-white">
            <b className="block font-display text-[0.55rem] font-bold">Glow Studio</b>
            <small className="text-[0.44rem] opacity-85">Hair Salon · DHA, Lahore</small>
          </div>
          <p className="mb-1.5 font-display text-[0.5rem] font-bold">Select Time</p>
          <div className="mb-2 grid grid-cols-3 gap-1">
            {slots.map((s) => (
              <span key={s} className={`tnum rounded border py-0.5 text-center font-mono text-[0.42rem] ${
                s === '1:00' ? 'border-brand bg-brand font-semibold text-white' : 'border-line bg-white text-muted'
              }`}>{s}</span>
            ))}
          </div>
          <div className="rounded-md bg-navy py-1.5 text-center font-display text-[0.5rem] font-bold text-white">
            Confirm Booking
          </div>
        </div>
      </div>

      <div className="hidden w-[130px] scale-90 rounded-2xl bg-[#C9D2DE] p-2 opacity-45 shadow-lg sm:block">
        <div className="min-h-[150px] rounded-xl bg-soft p-2.5">
          <div className="mb-2 rounded-[7px] bg-navy px-2 py-1.5 text-white">
            <b className="block font-display text-[0.55rem] font-bold">Ayesha M.</b>
            <small className="text-[0.44rem] opacity-85">Customer</small>
          </div>
          {['Upcoming', 'History', 'Favorites', 'Settings'].map((r) => (
            <div key={r} className="py-1 text-[0.5rem] text-muted">{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Benefits */
export function Benefits() {
  return (
    <section id="benefits" className="bg-soft py-[84px]">
      <div className="container">
        <SectionHead
          pill="Benefits"
          title="Built for Everyone"
          subtitle="Whether you're booking your next haircut or managing a bustling salon, NearAppoint has the tools you need."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <BenefitCard
            icon={<User className="size-[17px]" />}
            title="For Customers"
            sub="Discover and book local services with zero friction."
            items={CUSTOMER_BENEFITS}
            cta="Start Booking"
          />
          <BenefitCard
            dark
            icon={<Building2 className="size-[17px]" />}
            title="For Businesses"
            sub="Run your entire business from a single, powerful platform."
            items={BUSINESS_BENEFITS}
            cta="Register Business"
          />
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ dark, icon, title, sub, items, cta }: {
  dark?: boolean; icon: React.ReactNode; title: string; sub: string; items: readonly string[]; cta: string;
}) {
  return (
    <div className={`rounded-lg p-[30px] ${dark ? 'bg-navy' : 'border border-line bg-white'}`}>
      <span className={`grid size-9 place-items-center rounded-sm ${dark ? 'bg-brand/20' : 'bg-brand-tint'} text-brand`}>
        {icon}
      </span>
      <h3 className={`mb-1.5 mt-4 text-[1.3rem] ${dark ? 'text-white' : ''}`}>{title}</h3>
      <p className={`mb-5 text-[0.88rem] ${dark ? 'text-white/55' : 'text-muted'}`}>{sub}</p>
      <ul className="mb-6 flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it} className={`flex items-start gap-2.5 text-[0.87rem] leading-snug ${dark ? 'text-white/80' : ''}`}>
            <Check className="mt-0.5 size-[15px] flex-none text-brand" strokeWidth={3} />
            {it}
          </li>
        ))}
      </ul>
      <Button asChild><Link href="/signup">{cta} <ArrowRight /></Link></Button>
    </div>
  );
}

/* ------------------------------------------------------------- NavyStats */
export function NavyStats() {
  if (!SITE.showStats) return null;
  const items = [
    [SITE.stats.businesses, 'Businesses on Platform'],
    [SITE.stats.customers, 'Registered Customers'],
    [SITE.stats.appointments, 'Appointments Completed'],
    [SITE.stats.cities, 'Cities Covered'],
  ] as const;

  return (
    <section className="bg-navy py-[66px]">
      <div className="container">
        <p className="mb-7 text-center font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/40">
          The Numbers Tell the Story
        </p>
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {items.map(([n, l]) => (
            <div key={l}>
              <div className="tnum font-display text-[2rem] font-extrabold tracking-tight text-brand">{n}</div>
              <div className="mt-1 text-[0.78rem] text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Testimonials */
export function Testimonials() {
  if (!SITE.showTestimonials) return null;
  return (
    <section className="py-[84px]">
      <div className="container">
        <SectionHead
          pill="Testimonials"
          title="Loved by Customers & Businesses"
          subtitle="Real stories from the people building and using NearAppoint every day."
        />
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} interactive>
              <div className="mb-3 tracking-widest text-brand" aria-hidden>★★★★★</div>
              <p className="mb-4 text-[0.87rem] leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-2.5 border-t border-line pt-3.5">
                <span style={{ background: t.color }}
                  className="grid size-[30px] flex-none place-items-center rounded-full font-display text-[0.62rem] font-bold text-white">
                  {t.name.split(' ').map((w) => w[0]).join('')}
                </span>
                <div>
                  <b className="block font-display text-[0.8rem] font-bold">{t.name}</b>
                  <small className="text-[0.68rem] text-faint">
                    {t.role}
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 font-display text-[0.55rem] font-bold ${
                      t.badge === 'Customer' ? 'bg-brand-tint text-brand' : 'bg-[#E8EDF5] text-navy'
                    }`}>{t.badge}</span>
                  </small>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- FAQ */
export function Faq() {
  return (
    <section id="faq" className="bg-soft py-[84px]">
      <div className="container">
        <SectionHead
          pill="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about NearAppoint. Can't find an answer? Contact our team."
        />
        <Accordion type="single" collapsible className="mx-auto flex max-w-[720px] flex-col gap-2.5">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Final CTA */
export function FinalCta() {
  return (
    <section id="cta" className="relative overflow-hidden bg-navy py-[88px] text-center">
      <div
        className="pointer-events-none absolute -top-36 left-1/2 h-[420px] w-[700px] -translate-x-1/2"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,.20), transparent 66%)' }}
      />
      <div className="container relative">
        <Pill onDark>Get Started Today</Pill>
        <h2 className="my-5 text-[clamp(2.2rem,4.4vw,3.2rem)] text-white">
          Find. Book. <span className="text-brand">Arrive.</span>
        </h2>
        <p className="mx-auto mb-7 max-w-[44ch] leading-relaxed text-white/60">
          Join customers and businesses across Pakistan using NearAppoint to save time and grow faster.
        </p>
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link href="/signup">Download the App</Link></Button>
          <Button asChild size="lg" variant="outlineLight"><Link href="/signup">Register Your Business</Link></Button>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {['Free to download', 'No credit card required', 'Cancel anytime'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-[0.78rem] text-white/40">
              <Check className="size-3 text-brand" strokeWidth={3} /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
