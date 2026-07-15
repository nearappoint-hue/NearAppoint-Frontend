import type { NextRequest } from 'next/server';
import { ReviewService } from '@/server/services/review.service';
import { db } from '@/server/database/client';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/public/reviews/:slug
 *
 * PUBLIC. No auth.
 *
 * ⚠️  Names are truncated to "Sana M." and phone numbers are NEVER returned.
 *
 * A review page that leaks a woman's full name next to the salon she visits and
 * the time she was there is a stalking tool. This is the single most dangerous
 * thing this product could accidentally build.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const rid = requestId();
  try {
    const { slug } = await params;

    const { data: b } = await db()
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .eq('is_listed', true)
      .maybeSingle();

    if (!b) throw new ApiError('NOT_FOUND', 'Not found.');

    const q = req.nextUrl.searchParams;
    return ok(await ReviewService.publicList(
      b.id,
      Number(q.get('limit') ?? 20),
      Number(q.get('offset') ?? 0),
    ));
  } catch (e) { return fail(e, rid); }
}
