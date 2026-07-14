import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { RosterService } from '@/server/services/roster.service';
import { ok, created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const q = req.nextUrl.searchParams;
    const today = new Date().toISOString().slice(0, 10);
    return ok(await RosterService.blocks(
      ctx.branchId, q.get('from') ?? today, q.get('to') ?? today));
  } catch (e) { return fail(e, rid); }
}

export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const b = await req.json();

    if (!b.from || !b.to) throw new ApiError('VALIDATION_FAILED', 'Pick the times.');
    if (!b.reason?.trim()) throw new ApiError('VALIDATION_FAILED', 'Say why.');

    const id = await RosterService.createBlock(ctx.branchId, ctx.userId, {
      staffId: b.staff_id ?? null,   // null = the whole branch
      from: b.from,
      to: b.to,
      reason: String(b.reason).trim(),
    });

    return created({ id });
  } catch (e) { return fail(e, rid); }
}
