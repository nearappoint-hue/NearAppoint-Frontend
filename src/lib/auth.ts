'use client';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';

/**
 * ⚠️  AUTH ONLY. This is deliberate.
 *
 * The Supabase client is created, its `.auth` namespace is exported, and the
 * client itself is thrown away. What you get back has signInWithOAuth(),
 * signInWithPassword(), getUser() — and it does NOT have `.from()`, `.rpc()`
 * or `.storage`.
 *
 * You cannot query a table from the browser. Not because you shouldn't —
 * because the method does not exist on the object you are handed.
 *
 * All data goes through /api/v1.
 */
function raw() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const auth = {
  /** Customers. The only way onto the platform from the public site. */
  signInWithGoogle: (next = '/home') =>
    raw().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
    }),

  /**
   * Businesses. We created this account by hand, after meeting them.
   * There is no self-serve business signup — see FEATURE_3.sql for why.
   */
  signInWithPassword: (email: string, password: string) =>
    raw().auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),

  updatePassword: (password: string) =>
    raw().auth.updateUser({ password }),

  getUser: () => raw().auth.getUser(),
  signOut: () => raw().auth.signOut(),

  /** The bearer token handed to the API client. */
  async accessToken(): Promise<string | null> {
    const { data } = await raw().auth.getSession();
    return data.session?.access_token ?? null;
  },
  onAuthStateChange: (cb: Parameters<ReturnType<typeof raw>['auth']['onAuthStateChange']>[0]) =>
    raw().auth.onAuthStateChange(cb),
};
