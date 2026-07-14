import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { CustomerService } from '@/server/services/customer.service';
import { ok, created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const q = req.nextUrl.searchParams;

    const [rows, total] = await Promise.all([
      CustomerService.search(
        ctx.businessId,
        q.get('q') ?? '',
        Number(q.get('limit') ?? 50),
        Number(q.get('offset') ?? 0),
      ),
      CustomerService.count(ctx.businessId),
    ]);

    return ok(rows, { total });
  } catch (e) { return fail(e, rid); }
}

export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const body = await req.json();

    const id = await CustomerService.create(ctx.businessId, {
      fullName: body.full_name ?? null,
      phone: String(body.phone ?? ''),
      notes: body.notes ?? null,
    });

    return created({ id });
  } catch (e) { return fail(e, rid); }
}
