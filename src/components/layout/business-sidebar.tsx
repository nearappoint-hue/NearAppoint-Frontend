'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, LayoutDashboard, Users, Scissors, UserCog, Clock,
  Store, LogOut, Menu, X, Plus, Moon, CalendarClock, CalendarOff, BarChart3, MessageCircle,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/**
 * THE SHELL.
 *
 * Slate-navy (#394763), not the marketing navy. She stares at this for eight
 * hours a day — the softer slate doesn't fight the content the way a hard navy
 * would.
 *
 * The active item gets an ORANGE LEFT BORDER, not a filled background. At a
 * glance, across a room, on a counter tablet, a 4px orange edge reads faster
 * than a colour change.
 */
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/today',          label: 'Today',     icon: LayoutDashboard },
  { href: '/calendar',       label: 'Calendar',  icon: CalendarDays },
  { href: '/customers',      label: 'Customers', icon: Users },
  { href: '/services',       label: 'Services',  icon: Scissors },
  { href: '/staff',          label: 'Staff',     icon: UserCog },
  { href: '/staff/schedules', label: 'Schedules', icon: CalendarClock },
  { href: '/staff/leave',    label: 'Leave',     icon: CalendarOff },
  { href: '/settings/hours', label: 'Hours',     icon: Clock },
  { href: '/settings/special-hours', label: 'Special hours', icon: Moon },
  { href: '/reports',        label: 'Reports',   icon: BarChart3 },
  { href: '/settings/reminders', label: 'Reminders', icon: MessageCircle },
  { href: '/settings/profile', label: 'Profile', icon: Store },
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
      {/* Mobile bar — she checks her phone constantly; the counter is a tablet. */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Image src="/assets/logo-mark.svg" alt="" width={26} height={26} className="h-[26px] w-auto" />
          <span className="font-display text-[0.95rem] font-extrabold tracking-tight text-ink">
            {businessName}
          </span>
        </div>
        <button onClick={() => setOpen(!open)} aria-label="Menu"
          className="grid size-10 place-items-center rounded-sm border border-line2 text-ink">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-shell transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* brand */}
        <div className="px-6 pb-6 pt-7">
          <div className="mb-4 flex items-center gap-2">
            <Image src="/assets/logo-mark-dark.svg" alt="" width={28} height={28}
              className="h-7 w-auto" />
            <span className="font-display text-[1.05rem] font-extrabold tracking-[-0.03em] text-white">
              Near<span className="text-brand">Appoint</span>
            </span>
          </div>
          <p className="truncate font-display text-[1.15rem] font-extrabold tracking-tight text-white">
            {businessName}
          </p>
          <p className="mt-0.5 font-display text-[0.62rem] font-bold uppercase tracking-[0.14em] text-shell-muted">
            Professional Management
          </p>
        </div>

        {/* nav */}
        {/* Overflow scrolls, but no visible scrollbar. A permanent grey bar
            down the sidebar is noise she stares at for eight hours. */}
        <nav className="flex-1 overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3.5 border-l-4 px-5 py-3 font-display text-[0.94rem] font-semibold transition-colors',
                  active
                    ? 'border-brand bg-shell-active text-brand'
                    : 'border-transparent text-shell-muted hover:bg-shell-hover hover:text-white',
                )}
              >
                <Icon className="size-[19px] flex-none" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* footer */}
        <div className="space-y-1 p-4">
          <button
            onClick={() => { setOpen(false); router.push('/calendar'); }}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-brand py-3 font-display text-[0.92rem] font-bold text-white shadow-brand transition-colors hover:bg-brand-hover"
          >
            <Plus className="size-[18px]" /> New Appointment
          </button>

          <button onClick={() => void signOut()}
            className="flex w-full items-center gap-3.5 rounded-sm px-4 py-3 font-display text-[0.92rem] font-semibold text-shell-muted transition-colors hover:bg-shell-hover hover:text-white">
            <LogOut className="size-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
