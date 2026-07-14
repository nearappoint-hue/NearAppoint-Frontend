import { NextResponse, type NextRequest } from 'next/server';
import { ReminderService } from '@/server/services/reminder.service';
import { db } from '@/server/database/client';

export const dynamic = 'force-dynamic';

/**
 * WHATSAPP WEBHOOK.
 *
 * ⚠️  THIS IS WHERE THE FEATURE PAYS FOR ITSELF.
 *
 * She taps "I need to cancel" at 2pm. This fires. The appointment is cancelled,
 * the terminal status drops out of the EXCLUDE predicate, and THE 4PM SLOT IS
 * FREE — immediately, sellable to the walk-in standing at the counter.
 *
 * The alternative is she doesn't turn up, and the salon loses the hour, the
 * money, and a little more faith in the calendar.
 *
 * ---- SET-UP (Meta app dashboard) ----
 *   Callback URL:  https://www.nearappoint.com/api/webhooks/whatsapp
 *   Verify token:  the value of CRON_SECRET
 *   Subscribe to:  messages
 */

/** GET — Meta's one-time verification handshake. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const mode = q.get('hub.mode');
  const token = q.get('hub.verify_token');
  const challenge = q.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.CRON_SECRET) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/** POST — an incoming message or a status update. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;

        /* ---- 1. SHE TAPPED A BUTTON. The important path. ---- */
        for (const msg of value?.messages ?? []) {
          const buttonId = msg?.interactive?.button_reply?.id;
          if (!buttonId) continue;

          // We put the reminder id in the button payload precisely so we don't
          // have to guess which appointment she means — she might have two
          // bookings today.
          const [action, reminderId] = String(buttonId).split(':');
          if (!reminderId) continue;

          if (action === 'cancel') {
            await ReminderService.handleReply(reminderId, 'cancelled');
          } else if (action === 'yes') {
            await ReminderService.handleReply(reminderId, 'confirmed');
          }
        }

        /* ---- 2. Delivery receipts. Nice to have, not load-bearing. ---- */
        for (const st of value?.statuses ?? []) {
          const id = st?.id;
          const status = st?.status;   // sent | delivered | read | failed
          if (!id || !status) continue;

          if (['delivered', 'read', 'failed'].includes(status)) {
            await db().from('reminders')
              .update({ status })
              .eq('provider_message_id', id);
          }
        }
      }
    }
  } catch (err) {
    // ALWAYS 200 to Meta. A non-200 makes them retry, and a retry storm on a
    // parse error is far worse than a dropped receipt.
    console.error('[whatsapp:webhook]', err);
  }

  return NextResponse.json({ ok: true });
}
