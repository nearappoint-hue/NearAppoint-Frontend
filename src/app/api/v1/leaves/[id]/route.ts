import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';

/** PATCH — approve or reject. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    const b = await req.json();

    if (b.status !== 'approved' && b.status !== 'rejected') {
      throw new ApiError('VALIDATION_FAILED', 'Approve or reject.');
    }

    await RosterService.setLeaveStatus(ctx.branchId, id, b.status, ctx.userId);
    return ok({ id, status: b.status });
  } catch (e) { return fail(e, rid); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    await RosterService.removeLeave(ctx.branchId, id);
    return ok({ id });
  } catch (e) { return fail(e, rid); }
}
