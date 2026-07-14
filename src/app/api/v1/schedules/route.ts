import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await RosterService.schedules(ctx.branchId));
  } catch (e) { return fail(e, rid); }
}

/**
 * PUT /api/v1/schedules
 * Body: { staff_id, hours: [...] | null }
 *
 * hours = null  ->  she reverts to the salon's hours. That's the toggle.
 */
export async function PUT(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const b = await req.json();
    await RosterService.setHours(ctx.branchId, b.staff_id, b.hours ?? null);
    return ok(await RosterService.schedules(ctx.branchId));
  } catch (e) { return fail(e, rid); }
}
