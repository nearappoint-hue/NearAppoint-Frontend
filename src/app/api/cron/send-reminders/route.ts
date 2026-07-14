import type { NextRequest } from 'next/server';
import { guardCron } from '@/server/lib/cron';
import { ReminderService } from '@/server/services/reminder.service';
import { ok, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/send-reminders
 *
 * Runs both windows on every invocation. Deliberately:
 *
 *   T-24h  — a confirmation
 *   T-2h   — a QUESTION, with a one-tap Cancel button
 *
 * The T-2h one is the whole point. A customer who cancels at 2pm frees a 4pm
 * slot the salon can still sell. One who ghosts costs them the chair.
 *
 * UNIQUE(appointment_id, kind) means this can run twice, or fail halfway and
 * be retried, and the customer still gets exactly one message. The cron is
 * allowed to be stupid; the database is not.
 */
export async function GET(req: NextRequest) {
  const blocked = guardCron(req);
  if (blocked) return blocked;

  const rid = requestId();
  try {
    const [r24, r2] = await Promise.all([
      ReminderService.runCron('24h'),
      ReminderService.runCron('2h'),
    ]);

    if (r24.sent || r2.sent || r24.skipped || r2.skipped) {
      console.info('[cron:reminders]', { '24h': r24, '2h': r2, rid });
    }

    return ok({ '24h': r24, '2h': r2 });
  } catch (e) {
    return fail(e, rid);
  }
}
