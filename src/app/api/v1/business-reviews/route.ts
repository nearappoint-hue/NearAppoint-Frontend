import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ReviewService } from '@/server/services/review.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await ReviewService.forBusiness(ctx.businessId));
  } catch (e) { return fail(e, rid); }
}
