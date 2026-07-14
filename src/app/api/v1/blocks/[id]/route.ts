import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    await RosterService.removeBlock(ctx.branchId, id);
    return ok({ id });
  } catch (e) { return fail(e, rid); }
}
