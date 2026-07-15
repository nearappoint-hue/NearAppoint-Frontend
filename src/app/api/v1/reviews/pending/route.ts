import type { NextRequest } from 'next/server';
import { requireAuth } from '@/server/services/auth.service';
import { ReviewService } from '@/server/services/review.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/** GET /api/v1/reviews/pending — visits she could still review. */
export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const actor = await requireAuth(req);
    return ok(await ReviewService.pending(actor.userId));
  } catch (e) { return fail(e, rid); }
}
