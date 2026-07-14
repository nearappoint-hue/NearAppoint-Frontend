import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';
import { isConnected, sendText, sendStillComing } from '@/server/lib/whatsapp';

/**
 * REMINDERS — THE NO-SHOW DEFENCE.
 *
 * We removed the booking fee. There is now nothing between a salon owner and an
 * empty chair on a Saturday except this.
 *
 * The T-2h message is not a reminder. It is a QUESTION with a one-tap Cancel
 * button. A customer who cancels at 2pm frees a slot they can still fill. One
 * who simply doesn't turn up costs them the chair, the hour, and their trust in
 * the calendar.
 */
export interface Settings {
  whatsapp_number: string | null;
  connected: boolean;
  send_24h: boolean;
  send_2h: boolean;
}

export interface Stats {
  sent: number;
  confirmed: number;
  cancelled: number;
  no_reply: number;
  confirmed_pct: number;
  cancelled_pct: number;
}

export interface Recent {
  id: string;
  customer_name: string;
  start_at: string;
  kind: '24h' | '2h';
  status: string;
  reply: 'confirmed' | 'cancelled' | null;
}

export interface AtRisk {
  appointment_id: string;
  customer_name: string;
  phone: string;
  start_at: string;
  no_show_count: number;
  total_visits: number;
  no_reply: boolean;
  reason: string;
}

export class ReminderService {
  static async settings(businessId: string): Promise<Settings> {
    const { data } = await db()
      .from('reminder_settings')
      .select('whatsapp_number, send_24h, send_2h')
      .eq('business_id', businessId)
      .maybeSingle();

    if (!data) {
      // Both reminders default to ON. A salon that has to go and switch
      // reminders on is a salon that never switches reminders on.
      await db().from('reminder_settings').insert({ business_id: businessId });
      return {
        whatsapp_number: null,
        connected: isConnected(),
        send_24h: true,
        send_2h: true,
      };
    }

    return {
      whatsapp_number: data.whatsapp_number,
      connected: isConnected() && !!data.whatsapp_number,
      send_24h: data.send_24h,
      send_2h: data.send_2h,
    };
  }

  static async updateSettings(businessId: string, patch: {
    whatsappNumber?: string | null;
    send24h?: boolean;
    send2h?: boolean;
  }): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.whatsappNumber !== undefined) {
      update.whatsapp_number = patch.whatsappNumber;
      update.whatsapp_verified_at = patch.whatsappNumber ? new Date().toISOString() : null;
    }
    if (patch.send24h !== undefined) update.send_24h = patch.send24h;
    if (patch.send2h !== undefined)  update.send_2h = patch.send2h;

    await db().from('reminder_settings')
      .upsert({ business_id: businessId, ...update }, { onConflict: 'business_id' });
  }

  static async stats(businessId: string): Promise<Stats> {
    const { data } = await db().rpc('reminder_stats', { p_business_id: businessId });
    return data as Stats;
  }

  static async recent(businessId: string, limit = 12): Promise<Recent[]> {
    const { data } = await db()
      .from('reminders')
      .select(`
        id, kind, status, reply,
        appointments ( time_range, business_customers ( full_name ) )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data ?? []).map((r: Record<string, any>) => ({
      id: r.id,
      customer_name: r.appointments?.business_customers?.full_name ?? 'Walk-in',
      start_at: firstOf(r.appointments?.time_range),
      kind: r.kind,
      status: r.status,
      reply: r.reply,
    }));
  }

  /** The card on the Today screen. */
  static async atRisk(branchId: string): Promise<AtRisk[]> {
    const { data } = await db().rpc('at_risk_today', { p_branch_id: branchId });
    return (data ?? []) as AtRisk[];
  }

  /**
   * THE CRON. Runs every 10 minutes.
   *
   * Builds the message, records it as a ROW, then sends. In that order —
   * because a send that fails silently is a no-show you didn't prevent and
   * cannot explain.
   *
   * UNIQUE(appointment_id, kind) means the cron may run twice and the customer
   * still gets exactly one message. Duplicate reminders are worse than none:
   * they make the salon look broken.
   */
  static async runCron(kind: '24h' | '2h'): Promise<{ queued: number; sent: number; skipped: number }> {
    const { data, error } = await db().rpc('reminders_due', { p_kind: kind });
    if (error) throw new ApiError('INTERNAL', 'Could not find due reminders.');

    const due = (data ?? []) as any[];
    let sent = 0, skipped = 0;

    for (const a of due) {
      const body = kind === '24h' ? build24h(a) : build2h(a);

      // Record it FIRST. If the send fails, we still know we tried, and why.
      const { data: row, error: insErr } = await db()
        .from('reminders')
        .insert({
          appointment_id: a.appointment_id,
          business_id: a.business_id,
          kind,
          to_phone: a.phone,
          body,
          scheduled_for: new Date().toISOString(),
          status: 'queued',
        })
        .select('id')
        .single();

      // 23505 = someone else's cron run already queued this. Fine. Move on.
      if (insErr) { skipped++; continue; }

      if (!isConnected()) {
        // Dormant. Record what we WOULD have sent — so when WhatsApp is
        // finally connected you can look at the outbox and see it was right.
        await db().from('reminders')
          .update({ status: 'skipped_no_provider' })
          .eq('id', row.id);
        skipped++;
        continue;
      }

      const res = kind === '2h'
        ? await sendStillComing(a.phone, body, row.id)
        : await sendText(a.phone, body);

      await db().from('reminders').update({
        status: res.ok ? 'sent' : 'failed',
        provider_message_id: res.messageId ?? null,
        failure_reason: res.error ?? null,
        sent_at: res.ok ? new Date().toISOString() : null,
      }).eq('id', row.id);

      res.ok ? sent++ : skipped++;
    }

    return { queued: due.length, sent, skipped };
  }

  /** She tapped a button. This is the moment the feature pays for itself. */
  static async handleReply(
    reminderId: string, reply: 'confirmed' | 'cancelled',
  ): Promise<void> {
    await db().rpc('handle_reminder_reply', {
      p_reminder_id: reminderId,
      p_reply: reply,
    });
  }
}

/* ---------------------------------------------------------------- messages -- */

/**
 * T-24h. A confirmation, not a question.
 *
 * The LANDMARK is in the message, not the street address. "House 42, Street 7"
 * will not get her to the door in Lahore; "Opposite Emporium Mall" will. This
 * is the message she'll screenshot.
 */
function build24h(a: any): string {
  const t = new Date(a.start_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi',
  });

  const lines = [
    `Hi ${a.customer_name} — you're booked at ${a.business_name} tomorrow at ${t}.`,
    ``,
    `${a.services}${a.staff_name ? ` with ${a.staff_name}` : ''}`,
  ];

  if (a.landmark) lines.push(``, `📍 ${a.landmark}`);
  lines.push(``, `See you then!`);

  return lines.join('\n');
}

/**
 * T-2h. A QUESTION.
 *
 * Short, because she's reading it on a phone while doing something else. The
 * buttons carry the meaning; the text just has to make the question obvious.
 */
function build2h(a: any): string {
  const t = new Date(a.start_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi',
  });

  return `Hi ${a.customer_name} — still coming at ${t} today?`;
}

function firstOf(range: string | null): string {
  if (!range) return '';
  const m = range.match(/^[\[(]"?([^",]+)"?,/);
  return m ? new Date(m[1]!).toISOString() : '';
}
