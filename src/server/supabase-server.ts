import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * User-scoped server client. RLS APPLIES.
 *
 * This is NOT the service-role client (src/server/database/client.ts). Use this
 * to find out WHO is asking. Use that one to actually fetch data, after you
 * have decided they are allowed to see it.
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* Server Component — middleware refreshes the session instead. */
          }
        },
      },
    },
  );
}
