import 'server-only';
import { db } from '@/server/database/client';
import {
  emailConnected, sendEmail, bookingConfirmedEmail, reviewRequestEmail,
} from '@/server/lib/email';

/**
 * TRANSACTIONAL EMAIL.
 *
 * Every email is a ROW before it is a message.
 *
 * An email that fails silently is a customer standing outside a salon that isn't
 * expecting her. The row is the difference between "we sent it" and "we think we
 * sent it".
 *
 * UNIQUE(appointment_id, kind) means this can be called twice and she still gets
 * exactly one. Duplicate confirmations make you look broken.
 */
export class EmailService {
  /**
   * Fired the moment she books.
   *
   * Non-blocking by design: if the email fails, the BOOKING STILL EXISTS. We
   * never fail a confirmed appointment because an SMTP server had a bad day.
   */
  static async bookingConfirmed(appointmentId: string): Promise<void> {
    const { data: a } = await db()
      .from('appointments')
      .select(`
        id, reference, total, time_range, customer_id, business_id,
        businesses ( display_name ),
        branches ( phone, address_line, landmark, city, location ),
        business_customers ( full_name ),
        appointment_items ( service_name, sequence, staff ( full_name ) )
      `)
      .eq('id', appointmentId)
      .maybeSingle();

    if (!a?.customer_id) return;   // walk-in. No account, no email.

    const { data: c } = await db()
      .from('customers')
      .select('email, full_name')
      .eq('id', a.customer_id)
      .maybeSingle();

    if (!c?.email) {
      await EmailService.record(appointmentId, (a as any).business_id,
        'booking_confirmed', '', '', '', 'skipped_no_email');
      return;
    }

    const items = ((a as any).appointment_items ?? [])
      .sort((x: any, y: any) => x.sequence - y.sequence);

    const br = (a as any).branches;
    const lat = br?.location?.coordinates?.[1];
    const lng = br?.location?.coordinates?.[0];

    const { subject, html } = bookingConfirmedEmail({
      customerName: (c.full_name ?? 'there').split(' ')[0]!,
      businessName: (a as any).businesses?.display_name ?? 'the salon',
      reference: (a as any).reference,
      startAt: firstOf((a as any).time_range),
      services: items.map((i: any) => i.service_name),
      staffName: items[0]?.staff?.full_name ?? null,
      landmark: br?.landmark ?? null,
      address: br?.address_line ?? '',
      city: br?.city ?? '',
      phone: br?.phone ?? '',
      total: Number((a as any).total),
      mapsUrl: lat && lng
        ? `https://maps.google.com/?q=${lat},${lng}`
        : `https://maps.google.com/?q=${encodeURIComponent(
            `${br?.landmark ?? br?.address_line} ${br?.city}`)}`,
    });

    await EmailService.send(
      appointmentId, (a as any).business_id, 'booking_confirmed',
      c.email, subject, html,
    );
  }

  /** "How was it?" — the day after. */
  static async reviewRequest(appointmentId: string): Promise<void> {
    const { data: a } = await db()
      .from('appointments')
      .select('id, customer_id, business_id, businesses ( display_name )')
      .eq('id', appointmentId)
      .maybeSingle();

    if (!a?.customer_id) return;

    const { data: c } = await db()
      .from('customers')
      .select('email, full_name')
      .eq('id', a.customer_id)
      .maybeSingle();

    if (!c?.email) return;

    const { subject, html } = reviewRequestEmail({
      customerName: (c.full_name ?? 'there').split(' ')[0]!,
      businessName: (a as any).businesses?.display_name ?? 'the salon',
      reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings?review=${appointmentId}`,
    });

    await EmailService.send(
      appointmentId, (a as any).business_id, 'review_request',
      c.email, subject, html,
    );
  }

  /* ------------------------------------------------------------------ */

  private static async send(
    appointmentId: string, businessId: string, kind: string,
    to: string, subject: string, html: string,
  ): Promise<void> {
    // Record FIRST. If the send fails we still know we tried, and why.
    const { data: row, error } = await db()
      .from('emails')
      .insert({
        appointment_id: appointmentId,
        business_id: businessId,
        kind,
        to_email: to,
        subject,
        body_html: html,
        status: 'queued',
      })
      .select('id')
      .single();

    // 23505 = already queued by another call. Fine. She gets exactly one.
    if (error || !row) return;

    if (!emailConnected()) {
      // Dormant. Record what we WOULD have sent, so when Resend is finally
      // connected you can look at the outbox and see it was right.
      await db().from('emails')
        .update({ status: 'skipped_no_provider' })
        .eq('id', row.id);
      return;
    }

    const res = await sendEmail(to, subject, html);

    await db().from('emails').update({
      status: res.ok ? 'sent' : 'failed',
      provider_id: res.id ?? null,
      failure_reason: res.error ?? null,
      sent_at: res.ok ? new Date().toISOString() : null,
    }).eq('id', row.id);
  }

  private static async record(
    appointmentId: string, businessId: string, kind: string,
    to: string, subject: string, html: string, status: string,
  ): Promise<void> {
    await db().from('emails').insert({
      appointment_id: appointmentId,
      business_id: businessId,
      kind, to_email: to || 'unknown',
      subject: subject || '(none)',
      body_html: html || '(none)',
      status,
    });
  }
}

function firstOf(range: string | null): string {
  if (!range) return '';
  const m = range.match(/^[\[(]"?([^",]+)"?,/);
  return m ? new Date(m[1]!).toISOString() : '';
}
