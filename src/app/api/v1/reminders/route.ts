import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { ReminderService } from '@/server/services/reminder.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);

    const [settings, stats, recent] = await Promise.all([
      ReminderService.settings(ctx.businessId),
      ReminderService.stats(ctx.businessId),
      ReminderService.recent(ctx.businessId),
    ]);

    return ok({ settings, stats, recent });
  } catch (e) { return fail(e, rid); }
}

export async function PATCH(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const b = await req.json();

    await ReminderService.updateSettings(ctx.businessId, {
      whatsappNumber: b.whatsapp_number,
      send24h: b.send_24h,
      send2h: b.send_2h,
    });

    return ok(await ReminderService.settings(ctx.businessId));
  } catch (e) { return fail(e, rid); }
}
