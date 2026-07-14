import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { OverrideService } from '@/server/services/override.service';
import { ok, created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    return ok(await OverrideService.list(ctx.branchId));
  } catch (e) { return fail(e, rid); }
}

export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const b = await req.json();

    const id = await OverrideService.upsert(ctx.branchId, {
      id: b.id ?? null,
      kind: b.kind ?? 'seasonal',
      name: String(b.name ?? ''),
      from: String(b.from ?? ''),
      to: String(b.to ?? ''),
      hours: b.hours ?? null,
      isClosed: !!b.is_closed,
    });

    return created({ id });
  } catch (e) { return fail(e, rid); }
}
