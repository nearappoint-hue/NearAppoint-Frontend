import 'server-only';
import { db } from '@/server/database/client';
import { ApiError, isExclusionViolation } from '@/server/lib/errors';
import { EmailService } from '@/server/services/email.service';

/**
 * THE CUSTOMER SIDE.
 *
 * Everything here is PUBLIC — no auth for search and profiles. The security is
 * in what we EXPOSE, not who's asking:
 *
 *   - Only listed + verified businesses.
 *   - Only bookable services. Botox is absent, not greyed out.
 *   - A women-only salon NEVER appears for a male customer. Absent, not ranked
 *     lower. In this market that is the difference between a product women will
 *     use and one they won't, and getting it wrong once ends the brand.
 */
export interface BusinessCard {
  business_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  cover_url: string | null;
  category_name: string;
  area: string | null;
  city: string;
  landmark: string | null;
  rating_avg: number | null;
  rating_count: number;
  distance_km: number | null;
  from_price: number | null;
}

export class PublicService {
  static async search(opts: {
    city?: string; query?: string; category?: string;
    gender?: 'female' | 'male' | null;
    lat?: number | null; lng?: number | null;
  }): Promise<BusinessCard[]> {
    const { data, error } = await db().rpc('search_businesses', {
      /* NULL = everywhere. Defaulting to 'Lahore' meant the day we onboard a
         Karachi salon it would be INVISIBLE — not ranked lower, absent. The
         owner would sign in, see her calendar, and never appear in a single
         search, and nothing would error. */
      p_city:            opts.city ?? null,
      p_query:           opts.query || null,
      p_category_slug:   opts.category || null,
      p_customer_gender: opts.gender ?? null,
      p_lat:             opts.lat ?? null,
      p_lng:             opts.lng ?? null,
      p_limit:           20,
      p_offset:          0,
    });

    if (error) {
      console.error('[search]', error);
      throw new ApiError('INTERNAL', 'Search is having a moment. Try again.');
    }
    return (data ?? []) as BusinessCard[];
  }

  static async business(slug: string) {
    const { data, error } = await db().rpc('get_public_business', { p_slug: slug });
    if (error || !data) throw new ApiError('NOT_FOUND', 'We couldn\u2019t find that business.');

    // Turn storage paths into URLs here, once, rather than in three components.
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const b = data as Record<string, unknown>;
    b.photos = ((b.photos as string[]) ?? []).map(
      p => `${base}/storage/v1/object/public/business-photos/${p}`);

    return b;
  }

  /** Free slots at a business. Same engine the Business OS uses. */
  static async slots(branchId: string, serviceIds: string[], date: string, staffId?: string | null) {
    const { data, error } = await db().rpc('get_available_slots', {
      p_branch_id:   branchId,
      p_service_ids: serviceIds,
      p_date:        date,
      p_staff_id:    staffId ?? null,
    });

    if (error) throw new ApiError('INTERNAL', 'Could not load times.');

    // Group by time. She thinks "is 4pm free?", not "is Hina free?".
    const byTime = new Map<string, { id: string; name: string }[]>();
    for (const r of (data as any[]) ?? []) {
      const t = new Date(r.slot_start).toISOString();
      const list = byTime.get(t) ?? [];
      list.push({ id: r.staff_id, name: r.staff_name });
      byTime.set(t, list);
    }

    return [...byTime.entries()]
      .map(([start_at, staff]) => ({ start_at, staff }))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  static async book(input: {
    businessId: string; branchId: string; staffId: string;
    serviceIds: string[]; customerId: string; startAt: string; notes?: string;
  }) {
    const { data, error } = await db().rpc('create_customer_booking', {
      p_business_id: input.businessId,
      p_branch_id:   input.branchId,
      p_staff_id:    input.staffId,
      p_service_ids: input.serviceIds,
      p_customer_id: input.customerId,
      p_start_at:    input.startAt,
      p_notes:       input.notes ?? null,
    });

    if (error) {
      const msg = (error as { message?: string }).message ?? '';

      /**
       * The EXCLUDE constraint fired. Two customers tapped Confirm on the same
       * 6pm slot 50ms apart. One won.
       *
       * THIS IS NOT A FAILURE. This is why we chose Postgres.
       *
       * She gets a clean message with a next action — never a dead end. An
       * error that stops is a lost booking; an error that says "6:15 or 6:30?"
       * is a recovery.
       */
      if (isExclusionViolation(error)) {
        throw new ApiError('SLOT_TAKEN',
          'Someone just took that slot. Pick another time — there are others free.');
      }

      if (msg.includes('PHONE_REQUIRED')) {
        throw new ApiError('VALIDATION_FAILED',
          'We need your mobile number so we can remind you.', { need: 'phone' });
      }

      if (msg.includes('BOOKING_SUSPENDED')) {
        // Not shaming. Honest, and it tells her the door is still open.
        throw new ApiError('BOOKING_SUSPENDED',
          'You\u2019ve missed a few appointments recently, so online booking is paused for now. ' +
          'You can still walk in.');
      }

      if (msg.includes('SERVICE_NOT_BOOKABLE_ONLINE')) {
        throw new ApiError('FORBIDDEN',
          'That treatment can\u2019t be booked online. Please call the clinic.');
      }

      console.error('[book]', error);
      throw new ApiError('INTERNAL', 'Could not complete the booking.');
    }

    const row = (data as any[])?.[0];

    /**
     * The confirmation email. FIRE AND FORGET.
     *
     * Deliberately NOT awaited: if Resend has a bad day, the BOOKING STILL
     * EXISTS. We never fail a confirmed appointment because an email server
     * hiccupped — she'd see an error, try again, and hit the double-booking
     * constraint on her own booking.
     *
     * The email is a row in the outbox either way, so a failure is visible.
     */
    void EmailService.bookingConfirmed(row.out_appointment_id)
      .catch(e => console.error('[email:booking_confirmed]', e));

    return { id: row.out_appointment_id, reference: row.out_reference };
  }

  static async myBookings(customerId: string) {
    const { data } = await db().rpc('get_customer_bookings', { p_customer_id: customerId });
    return data ?? [];
  }

  static async cancel(appointmentId: string, customerId: string) {
    const { data: appt } = await db()
      .from('appointments')
      .select('id, status, time_range')
      .eq('id', appointmentId)
      .eq('customer_id', customerId)     // tenant guard: her booking, or nothing
      .maybeSingle();

    if (!appt) throw new ApiError('NOT_FOUND', 'Not found.');

    await db().rpc('set_appointment_status', {
      p_appointment_id: appointmentId,
      p_status: 'cancelled_by_customer',
      p_actor: customerId,
      p_final_amount: null,
    });
    // Cancelling RELEASES the slot — the terminal status drops out of the
    // EXCLUDE predicate, and someone else can have 6pm immediately.
  }
}
