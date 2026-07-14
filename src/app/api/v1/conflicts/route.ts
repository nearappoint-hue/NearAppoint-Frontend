import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/conflicts?staff_id=&from=&to=
 *
 * "2 appointments are already booked in this time."
 *
 * She should never discover a consequence after committing to it. This runs
 * BEFORE she blocks time or approves leave.
 */
export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const q = req.nextUrl.searchParams;

    return ok(await RosterService.conflicts(
      ctx.branchId,
      q.get('staff_id') || null,
      q.get('from') ?? '',
      q.get('to') ?? '',
    ));
  } catch (e) { return fail(e, rid); }
}
