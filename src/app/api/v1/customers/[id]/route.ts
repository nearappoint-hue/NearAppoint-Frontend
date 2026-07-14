import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { CustomerService } from '@/server/services/customer.service';
import { db } from '@/server/database/client';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';

async function assertOwned(id: string, businessId: string) {
  const { data } = await db().from('business_customers')
    .select('id').eq('id', id).eq('business_id', businessId).maybeSingle();
  if (!data) throw new ApiError('NOT_FOUND', 'Not found.');
}

/** GET — her history with THIS business. Not her life story. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    await assertOwned(id, ctx.businessId);
    return ok(await CustomerService.history(ctx.businessId, id));
  } catch (e) { return fail(e, rid); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  try {
    const { id } = await params;
    const ctx = await businessContext(req);
    await assertOwned(id, ctx.businessId);

    const body = await req.json();
    await CustomerService.update(id, {
      fullName: body.full_name,
      notes: body.notes,
      tags: body.tags,
    });

    return ok({ id });
  } catch (e) { return fail(e, rid); }
}
