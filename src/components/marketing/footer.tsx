'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Input } from '@/components/ui/input';

const COLUMNS = [
  { title: 'Company',  links: [['About Us', '#benefits'], ['Careers', '/careers'], ['Press', '/press'], ['Contact', '#cta']] },
  { title: 'Product',  links: [['How It Works', '#features'], ['Features', '#features'], ['Pricing', '#faq'], ['Mobile App', '/mobile']] },
  { title: 'Business', links: [['Register Business', '/signup'], ['Business Dashboard', '/login'], ['Analytics', '#business'], ['Pricing Plans', '#faq']] },
  { title: 'Legal',    links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Cookie Policy', '/cookies'], ['Refund Policy', '/refunds']] },
] as const;

export function Footer() {
  const [done, setDone] = React.useState(false);

  return (
    <footer className="border-t border-line bg-white pb-7 pt-14">
      <div className="container">
        <div className="grid gap-9 pb-10 md:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="my-3.5 max-w-[26ch] text-[0.9rem] leading-relaxed text-muted">
              Pakistan&apos;s Appointment Marketplace &amp; Business Operating System.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); setDone(true); }}
              className="flex max-w-[260px] gap-2"
            >
              <Input
                type="email"
                required
                disabled={done}
                placeholder={done ? "You're on the list" : 'Enter your email'}
                aria-label="Email address"
                className="py-2.5 text-[0.87rem]"
              />
              <button
                type="submit"
                disabled={done}
                aria-label="Subscribe"
                className="grid w-[38px] flex-none place-items-center rounded-sm bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </form>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col items-start gap-2.5">
              <h4 className="mb-1 font-display text-[0.74rem] font-bold uppercase tracking-[0.1em] text-faint">
                {col.title}
              </h4>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href} className="text-[0.9rem] text-muted transition-colors hover:text-brand">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-line pt-5.5 text-[0.84rem] text-faint">
          <span>© {new Date().getFullYear()} NearAppoint. All rights reserved.</span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-brand">Privacy</Link>
            <Link href="/terms" className="hover:text-brand">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
