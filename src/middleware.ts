import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * ROUTE GUARDS.
 *
 * A customer must never reach /today. A business must never land in the
 * customer app. Both are confusing rather than dangerous — but a confused user
 * on their first login is a user who thinks the product is broken.
 *
 * The real security is RLS + the server layer. This is the UX guard.
 */
const BUSINESS_ROUTES = ['/today', '/calendar', '/customers', '/services', '/staff', '/settings'];
const CUSTOMER_ROUTES = ['/home', '/search', '/bookings'];
const ADMIN_ROUTES    = ['/admin'];
const AUTH_ROUTES     = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
        },
      },
    },
  );

  /**
   * getUser(), NOT getSession().
   *
   * getSession() reads the cookie and TRUSTS it without verifying the JWT
   * signature. A forged cookie sails straight through. It is a one-line
   * mistake, it is invisible in review, and it is a complete auth bypass.
   */
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const needsAuth = [...BUSINESS_ROUTES, ...CUSTOMER_ROUTES, ...ADMIN_ROUTES]
    .some(p => path.startsWith(p));

  if (needsAuth && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (!user) return res;

  // Which front door did they come in?
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('account_type, must_change_password')
    .eq('id', user.id)
    .maybeSingle();

  const type = profile?.account_type ?? 'customer';

  // We set her password out loud in her shop. She changes it before doing
  // anything else, so we aren't holding a working key to her account.
  if (profile?.must_change_password && path !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  const home = type === 'business' ? '/today' : type === 'admin' ? '/admin' : '/home';

  // Already signed in and hitting /login? Send them where they belong.
  if (AUTH_ROUTES.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Wrong front door.
  if (type === 'customer' && BUSINESS_ROUTES.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/home', req.url));
  }
  if (type === 'business' && CUSTOMER_ROUTES.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/today', req.url));
  }
  if (type !== 'admin' && ADMIN_ROUTES.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|api|.*\\.svg$).*)'],
};
