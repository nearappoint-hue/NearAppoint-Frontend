'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, LayoutDashboard, Users, Scissors, UserCog, Settings, LogOut, Menu, X,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/today',     label: 'Today',     icon: LayoutDashboard },
  { href: '/calendar',  label: 'Calendar',  icon: CalendarDays, soon: true },
  { href: '/customers', label: 'Customers', icon: Users,        soon: true },
  { href: '/services',  label: 'Services',  icon: Scissors,     soon: true },
  { href: '/staff',     label: 'Staff',     icon: UserCog,      soon: true },
  { href: '/settings',  label: 'Settings',  icon: Settings,     soon: true },
];

export function BusinessSidebar({ businessName }: { businessName: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const signOut = async () => {
    await auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile bar. The owner checks her phone constantly; the counter uses a tablet. */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(!open)} aria-label="Menu"
          className="grid size-10 place-items-center rounded-sm border border-line2">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-line bg-white transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="border-b border-line p-5">
          <Logo />
          <p className="mt-3 truncate font-display text-[0.88rem] font-bold text-ink">{businessName}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon, soon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={soon ? '#' : href}
                onClick={(e) => { if (soon) e.preventDefault(); setOpen(false); }}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2.5 font-display text-[0.9rem] font-semibold transition-colors',
                  active ? 'bg-brand-tint text-brand'
                         : soon ? 'cursor-default text-faint'
                                : 'text-muted hover:bg-soft hover:text-ink',
                )}
              >
                <Icon className="size-[18px]" />
                {label}
                {soon && (
                  <span className="ml-auto rounded bg-soft px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-faint">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button onClick={() => void signOut()}
          className="m-3 flex items-center gap-3 rounded-sm px-3 py-2.5 font-display text-[0.9rem] font-semibold text-muted transition-colors hover:bg-soft hover:text-ink">
          <LogOut className="size-[18px]" /> Sign out
        </button>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-navy/30 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
