import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ProfileService } from '@/server/services/profile.service';
import { created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/photos
 *
 * The file is uploaded straight to Supabase Storage from the browser — we never
 * proxy image bytes through a serverless function, which is slow and has a
 * payload limit. The browser then tells us the path it wrote to, and we record it.
 */
export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const body = await req.json();
    const id = await ProfileService.addPhoto(ctx.businessId, String(body.storage_path ?? ''));
    return created({ id });
  } catch (e) { return fail(e, rid); }
}
