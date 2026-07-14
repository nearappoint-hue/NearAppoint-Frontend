'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, LogOut, Menu, X, Search } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';

export function CustomerNav() {
  const router = useRouter();
  const [signedIn, setSignedIn] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = auth.onAuthStateChange(async (_e, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setSignedIn(false);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-warm-line/50 bg-warm/85 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <Logo />

        <div className="hidden items-center gap-7 lg:flex">
          <Link href="/home"
            className="inline-flex items-center gap-1.5 text-[0.92rem] font-medium text-warm-muted transition-colors hover:text-warm-ink">
            <Search className="size-4" /> Find a salon
          </Link>
          {signedIn && (
            <Link href="/bookings"
              className="inline-flex items-center gap-1.5 text-[0.92rem] font-medium text-warm-muted transition-colors hover:text-warm-ink">
              <Calendar className="size-4" /> My bookings
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <button onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-full border border-warm-line bg-white px-4 py-2.5 font-display text-[0.88rem] font-bold text-warm-ink transition-colors hover:border-warm-faint">
              <LogOut className="size-4" /> Sign out
            </button>
          ) : signedIn === false ? (
            <>
              <Link href="/login"
                className="hidden font-display text-[0.9rem] font-semibold text-warm-ink transition-colors hover:text-brand sm:block">
                Sign in
              </Link>
              <Button asChild className="rounded-full"><Link href="/signup">Get started</Link></Button>
            </>
          ) : null}

          <button onClick={() => setOpen(!open)} aria-label="Menu"
            className="grid size-10 place-items-center rounded-full border border-warm-line bg-white text-warm-ink lg:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-warm-line/50 bg-warm px-6 py-4 lg:hidden">
          <Link href="/home" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 border-b border-warm-line/50 py-3.5 font-display font-semibold text-warm-ink">
            <Search className="size-4" /> Find a salon
          </Link>
          {signedIn && (
            <Link href="/bookings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 py-3.5 font-display font-semibold text-warm-ink">
              <Calendar className="size-4" /> My bookings
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
