import type { NextRequest } from 'next/server';
import { requireAuth } from '@/server/services/auth.service';
import { AccountService } from '@/server/services/account.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/** GET /api/v1/account/me */
export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const actor = await requireAuth(req);
    const account = await AccountService.get(actor.userId);
    return ok(account);
  } catch (e) {
    return fail(e, rid);
  }
}
