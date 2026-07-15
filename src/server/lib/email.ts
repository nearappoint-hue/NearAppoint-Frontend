import 'server-only';
import { serverEnv } from '@/server/env';

/**
 * EMAIL. Resend.
 *
 * ⚠️  DORMANT UNTIL RESEND_API_KEY EXISTS.
 *
 * Without it, send() returns { skipped: true } and the email is recorded as
 * 'skipped_no_provider'. When you connect, you can open the outbox and see
 * exactly what would have been sent — instead of finding out live.
 *
 * ---- WHY THIS MATTERS MORE THAN IT SOUNDS ----
 *
 * Right now a customer books and receives NOTHING. She has to trust a screen she
 * saw for two seconds and remember a time she was told once.
 *
 * That is not a missing feature. It is a broken booking.
 */
export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export function emailConnected(): boolean {
  return !!serverEnv().RESEND_API_KEY;
}

export async function sendEmail(
  to: string, subject: string, html: string,
): Promise<SendResult> {
  if (!emailConnected()) return { ok: false, skipped: true };

  const e = serverEnv();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${e.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: e.EMAIL_FROM ?? 'NearAppoint <hello@nearappoint.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json?.message ?? 'Resend rejected the message.' };
    }

    return { ok: true, id: json?.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* ====================================================================== */

/**
 * The booking confirmation.
 *
 * THE LANDMARK IS THE HEADLINE, not the street address. "House 42, Street 7,
 * Block C" will not get her to the door in Pakistan. "Opposite Emporium Mall,
 * near the KFC" will.
 *
 * This is the email she will screenshot and show to a rickshaw driver. Design
 * it for that, not for a desktop inbox.
 */
export function bookingConfirmedEmail(a: {
  customerName: string;
  businessName: string;
  reference: string;
  startAt: string;
  services: string[];
  staffName: string | null;
  landmark: string | null;
  address: string;
  city: string;
  phone: string;
  total: number;
  mapsUrl: string;
}): { subject: string; html: string } {
  const d = new Date(a.startAt);

  const date = d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'Asia/Karachi',
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Karachi',
  });

  const subject = `You're booked at ${a.businessName} — ${date}, ${time}`;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#FFF8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E0C0B1;">

        <!-- header -->
        <tr><td style="padding:28px 32px 0;">
          <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#251913;">
            Near<span style="color:#F97316;">Appoint</span>
          </span>
        </td></tr>

        <!-- the headline -->
        <tr><td style="padding:26px 32px 0;">
          <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.5px;color:#251913;">
            You're booked.
          </h1>
          <p style="margin:10px 0 0;font-size:16px;line-height:1.5;color:#584237;">
            ${esc(a.customerName)}, your appointment at
            <b style="color:#251913;">${esc(a.businessName)}</b> is confirmed.
          </p>
        </td></tr>

        <!-- when -->
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#FFF1EB;border-radius:14px;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#F97316;">
                When
              </p>
              <p style="margin:6px 0 0;font-size:19px;font-weight:800;color:#251913;">
                ${esc(date)}
              </p>
              <p style="margin:2px 0 0;font-size:24px;font-weight:800;color:#F97316;font-family:ui-monospace,monospace;">
                ${esc(time)}
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- what -->
        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8C7164;">
            What
          </p>
          <p style="margin:6px 0 0;font-size:16px;color:#251913;">
            ${esc(a.services.join(', '))}${a.staffName ? ` <span style="color:#584237;">with ${esc(a.staffName)}</span>` : ''}
          </p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#251913;font-family:ui-monospace,monospace;">
            Rs ${a.total.toLocaleString('en-PK')}
          </p>
          <p style="margin:4px 0 0;font-size:13px;color:#8C7164;">
            You pay the salon directly. Booking is free.
          </p>
        </td></tr>

        <!-- WHERE. The landmark is the headline. -->
        <tr><td style="padding:18px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border-left:3px solid #F97316;background:#FFF8F6;border-radius:0 12px 12px 0;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#F97316;">
                Where
              </p>
              ${a.landmark
                ? `<p style="margin:6px 0 0;font-size:17px;font-weight:700;line-height:1.4;color:#251913;">
                     📍 ${esc(a.landmark)}
                   </p>
                   <p style="margin:4px 0 0;font-size:14px;color:#584237;">
                     ${esc(a.address)}, ${esc(a.city)}
                   </p>`
                : `<p style="margin:6px 0 0;font-size:16px;line-height:1.4;color:#251913;">
                     ${esc(a.address)}, ${esc(a.city)}
                   </p>`}
              <p style="margin:10px 0 0;">
                <a href="${esc(a.mapsUrl)}" style="font-size:14px;font-weight:700;color:#F97316;text-decoration:none;">
                  Get directions →
                </a>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- actions -->
        <tr><td style="padding:24px 32px 0;">
          <a href="${esc(process.env.NEXT_PUBLIC_SITE_URL ?? '')}/bookings"
             style="display:block;background:#F97316;color:#ffffff;text-align:center;padding:15px;border-radius:999px;font-size:16px;font-weight:700;text-decoration:none;">
            View my booking
          </a>
          <a href="tel:${esc(a.phone)}"
             style="display:block;margin-top:10px;border:1px solid #E0C0B1;color:#251913;text-align:center;padding:14px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;">
            Call the salon
          </a>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0;padding-top:18px;border-top:1px solid #F0E3DC;font-size:12px;color:#8C7164;font-family:ui-monospace,monospace;">
            Ref ${esc(a.reference)}
          </p>
          <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8C7164;">
            Can't make it? Cancel from your bookings page and the salon will be told —
            it frees the slot for someone else.
          </p>
        </td></tr>
      </table>

      <p style="margin:20px 0 0;font-size:12px;color:#8C7164;">
        © ${new Date().getFullYear()} NearAppoint
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html };
}

/** "How was it?" — sent the day after. */
export function reviewRequestEmail(a: {
  customerName: string;
  businessName: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  const subject = `How was ${a.businessName}?`;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;border:1px solid #E0C0B1;">
        <tr><td style="padding:32px;text-align:center;">
          <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#251913;">
            Near<span style="color:#F97316;">Appoint</span>
          </span>

          <h1 style="margin:24px 0 0;font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:#251913;">
            How was ${esc(a.businessName)}?
          </h1>

          <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:#584237;">
            ${esc(a.customerName)}, it takes ten seconds — and it's the only thing
            that helps the next person choose well.
          </p>

          <div style="margin:24px 0;font-size:34px;letter-spacing:6px;color:#F97316;">
            ★★★★★
          </div>

          <a href="${esc(a.reviewUrl)}"
             style="display:block;background:#F97316;color:#ffffff;text-align:center;padding:15px;border-radius:999px;font-size:16px;font-weight:700;text-decoration:none;">
            Leave a review
          </a>

          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#8C7164;">
            Your review is public. Your phone number never is.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html };
}

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
