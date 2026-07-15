import type { NextRequest } from 'next/server';
import { requireAuth } from '@/server/services/auth.service';
import { ReviewService } from '@/server/services/review.service';
import { created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';

/** POST /api/v1/reviews — leave a review. */
export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const actor = await requireAuth(req);
    const b = await req.json();

    const rating = Number(b.rating);
    if (!rating || rating < 1 || rating > 5) {
      throw new ApiError('VALIDATION_FAILED', 'Pick a rating.');
    }

    const id = await ReviewService.create({
      appointmentId: String(b.appointment_id ?? ''),
      customerId: actor.userId,
      rating,
      body: b.body ?? null,
      tags: Array.isArray(b.tags) ? b.tags : [],
    });

    return created({ id });
  } catch (e) { return fail(e, rid); }
}
