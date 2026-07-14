import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { AvailabilityService } from '@/server/services/availability.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/** GET /api/v1/availability?date=2026-07-16&service_ids=a,b&staff_id= */
export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const q = req.nextUrl.searchParams;

    const date = q.get('date') ?? new Date().toISOString().slice(0, 10);
    const serviceIds = (q.get('service_ids') ?? '').split(',').filter(Boolean);
    const staffId = q.get('staff_id') || null;

    const slots = await AvailabilityService.slots(ctx.branchId, serviceIds, date, staffId);
    return ok(AvailabilityService.group(slots));
  } catch (e) { return fail(e, rid); }
}
