import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await RosterService.leaves(ctx.branchId));
  } catch (e) { return fail(e, rid); }
}

export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const b = await req.json();

    const id = await RosterService.upsertLeave(ctx.branchId, ctx.userId, {
      id: b.id ?? null,
      staffId: b.staff_id,
      type: b.type ?? 'annual',
      from: b.from,
      to: b.to,
      reason: b.reason ?? null,
      status: b.status ?? 'approved',
    });

    return created({ id });
  } catch (e) { return fail(e, rid); }
}
