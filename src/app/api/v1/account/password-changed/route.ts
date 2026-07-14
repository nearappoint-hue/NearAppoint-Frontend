import type { NextRequest } from 'next/server';
import { requireAuth } from '@/server/services/auth.service';
import { db } from '@/server/database/client';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/account/password-changed
 *
 * Clears must_change_password. Called after the owner sets her own password.
 *
 * Server-side, deliberately: a client that could clear this flag itself could
 * skip the password change entirely — and then we'd still be holding a working
 * key to her business.
 */
export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const actor = await requireAuth(req);
    await db()
      .from('user_profiles')
      .update({ must_change_password: false })
      .eq('id', actor.userId);
    return ok({ ok: true });
  } catch (e) {
    return fail(e, rid);
  }
}
