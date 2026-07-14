import type { NextRequest } from 'next/server';
import { businessContext } from '@/server/lib/business-context';
import { db } from '@/server/database/client';
import { created, fail } from '@/server/lib/response';
import { requestId } from '@/server/lib/request-id';
import { ApiError, isExclusionViolation } from '@/server/lib/errors';
import { toE164, isValidPkMobile } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/bookings — book ahead.
 *
 * Same transaction, same EXCLUDE constraint as a walk-in. The only difference
 * is that she isn't standing here yet.
 *
 * NOT in the body: a price. The database resolves it from branch_services.
 */
export async function POST(req: NextRequest) {
  const rid = requestId();
  try {
    const ctx = await businessContext(req);
    const body = await req.json();

    const phone = String(body.phone ?? '');
    if (!isValidPkMobile(phone)) {
      throw new ApiError('VALIDATION_FAILED',
        'A future booking needs a phone number \u2014 otherwise you can\u2019t remind them.');
    }
    if (!body.staff_id) throw new ApiError('VALIDATION_FAILED', 'Pick who will do it.');
    if (!body.start_at) throw new ApiError('VALIDATION_FAILED', 'Pick a time.');

    const { data, error } = await db().rpc('create_booking', {
      p_business_id: ctx.businessId,
      p_branch_id:   ctx.branchId,
      p_staff_id:    body.staff_id,
      p_service_ids: body.service_ids ?? [],
      p_phone:       toE164(phone),
      p_full_name:   body.full_name ?? null,
      p_start_at:    body.start_at,
      p_created_by:  ctx.userId,
      p_notes:       body.notes ?? null,
    });

    if (error) {
      /**
       * Someone booked this stylist in the 200ms since we showed her the slot
       * list. The constraint caught it. That is the system WORKING — she gets a
       * sentence she can act on, not a 500.
       */
      if (isExclusionViolation(error)) {
        throw new ApiError('SLOT_TAKEN',
          'That slot was just taken. Pick another time or stylist.');
      }
      throw new ApiError('INTERNAL',
        (error as { message?: string }).message ?? 'Could not create the booking.');
    }

    const row = (data as any[])?.[0];
    return created({
      id: row.out_appointment_id,
      reference: row.out_reference,
      ends_at: row.out_ends_at,
    });
  } catch (e) { return fail(e, rid); }
}
