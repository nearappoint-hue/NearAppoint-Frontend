import 'server-only';
import { serverEnv } from '@/server/env';

/**
 * WHATSAPP CLOUD API.
 *
 * ⚠️  DORMANT UNTIL CREDENTIALS EXIST.
 *
 * If WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set, send()
 * returns { skipped: true } and the reminder is recorded as
 * 'skipped_no_provider'.
 *
 * That is deliberate. When you finally connect, you can look at the outbox and
 * see EXACTLY what would have been sent, to whom, and when — instead of finding
 * out live, on a Saturday, with real customers.
 *
 * Meta approval takes 5-10 working days. Nothing in this file shortens that.
 */
export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export function isConnected(): boolean {
  const e = serverEnv();
  return !!(e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * A plain text message. Used for the T-24h confirmation.
 *
 * NOTE: outside a 24-hour customer-service window, Meta requires a pre-approved
 * TEMPLATE, not free text. Both of our messages are proactive, so both will need
 * approved templates. Free text is here for the reply flow, which IS inside the
 * window.
 */
export async function sendText(to: string, body: string): Promise<SendResult> {
  if (!isConnected()) return { ok: false, skipped: true };

  const e = serverEnv();

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body, preview_url: false },
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? 'WhatsApp rejected the message.' };
    }

    return { ok: true, messageId: json?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * The T-2h message. WITH BUTTONS.
 *
 * THIS IS THE ENTIRE FEATURE.
 *
 * A reminder that just says "you have an appointment" is a notification. A
 * message that ASKS — "still coming?" — with a one-tap Cancel button is a
 * no-show prevented and a slot the salon can still sell.
 *
 * The reply arrives at /api/webhooks/whatsapp, which cancels the appointment
 * and releases the chair immediately.
 */
export async function sendStillComing(
  to: string,
  body: string,
  reminderId: string,
): Promise<SendResult> {
  if (!isConnected()) return { ok: false, skipped: true };

  const e = serverEnv();

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body },
            action: {
              buttons: [
                // The reminder id rides in the button payload, so the webhook
                // knows exactly which appointment she answered about — without
                // us having to guess from a phone number that may have two
                // bookings today.
                { type: 'reply', reply: { id: `yes:${reminderId}`,    title: 'Yes, I\u2019ll be there' } },
                { type: 'reply', reply: { id: `cancel:${reminderId}`, title: 'I need to cancel' } },
              ],
            },
          },
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? 'WhatsApp rejected the message.' };
    }

    return { ok: true, messageId: json?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
