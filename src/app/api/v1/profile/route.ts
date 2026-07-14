import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ProfileService } from '@/server/services/profile.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await ProfileService.get(ctx.businessId, ctx.branchId));
  } catch (e) { return fail(e, rid); }
}

export async function PATCH(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const body = await req.json();
    await ProfileService.update(ctx.businessId, ctx.branchId, body);
    return ok(await ProfileService.get(ctx.businessId, ctx.branchId));
  } catch (e) { return fail(e, rid); }
}
