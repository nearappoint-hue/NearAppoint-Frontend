import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ReviewService } from '@/server/services/review.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/reviews/:id — the business replies.
 *
 * Replying to reviews, especially the bad ones, is the cheapest trust a business
 * will ever buy. A one-star with a calm, specific reply under it reads better to
 * the next customer than no one-star at all.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    const b = await req.json();

    await ReviewService.reply(id, ctx.businessId, String(b.reply ?? ''));
    return ok({ id });
  } catch (e) { return fail(e, rid); }
}
