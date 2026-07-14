import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ReminderService } from '@/server/services/reminder.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/at-risk
 *
 * Who probably isn't coming today.
 *
 * Two signals, both meaning "phone them now, before you lose the hour":
 *   - a history of not turning up
 *   - they were asked "still coming?" and said NOTHING
 *
 * Silence after a direct question is the strongest no-show predictor there is.
 */
export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await ReminderService.atRisk(ctx.branchId));
  } catch (e) { return fail(e, rid); }
}
