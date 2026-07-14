import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';

/**
 * WHO WORKS WHEN.
 *
 * Before this, everyone worked the branch's hours. Hina taking Tuesdays off was
 * impossible — so the calendar offered a Tuesday slot with Hina, a customer
 * booked it, and the salon had to phone her back to unbook her.
 *
 * That is the calendar lying. It is the single fastest way to make an owner
 * stop trusting the product and go back to the paper register.
 *
 * INHERITANCE: a staff member with NO rows works the salon's hours. We do not
 * copy the branch hours into seven rows per person — if we did, changing the
 * salon's hours would silently fail to change theirs.
 */
export interface DayHours {
  dow: number;      // 0 = Sunday
  opens: string;    // "11:00"
  closes: string;   // "21:00"
  closed: boolean;
}

export interface StaffSchedule {
  id: string;
  name: string;
  is_custom: boolean;
  hours: DayHours[];
  on_leave_now: boolean;
}

export interface Leave {
  id: string;
  staff_id: string;
  staff_name: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  from: string;
  to: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  is_current: boolean;
  is_soon: boolean;
}

export interface Block {
  id: string;
  staff_id: string | null;
  staff_name: string | null;
  reason: string | null;
  start_at: string;
  end_at: string;
}

export interface Conflict {
  id: string;
  reference: string;
  customer_name: string;
  staff_name: string | null;
  start_at: string;
  services: string[];
}

export class RosterService {
  /* ---------------------------------------------------------- schedules -- */

  static async schedules(branchId: string): Promise<StaffSchedule[]> {
    const { data, error } = await db().rpc('get_staff_schedules', {
      p_branch_id: branchId,
    });
    if (error) throw new ApiError('INTERNAL', 'Could not load the schedules.');
    return (data ?? []) as StaffSchedule[];
  }

  /**
   * Set (or clear) one person's hours.
   *
   * Passing an empty array REVERTS her to the salon's hours. That is not a
   * delete-and-lose-data operation — it is the correct way to say "she's back
   * to normal", and it's what the toggle in the UI does.
   */
  static async setHours(
    branchId: string, staffId: string, hours: DayHours[] | null,
  ): Promise<void> {
    const { error } = await db().rpc('set_staff_hours', {
      p_branch_id: branchId,
      p_staff_id: staffId,
      p_hours: hours && hours.length ? hours : null,
    });
    if (error) {
      throw new ApiError('VALIDATION_FAILED',
        (error as { message?: string }).message ?? 'Could not save.');
    }
  }

  /* -------------------------------------------------------------- leave -- */

  static async leaves(branchId: string): Promise<Leave[]> {
    const { data, error } = await db().rpc('get_leaves', { p_branch_id: branchId });
    if (error) throw new ApiError('INTERNAL', 'Could not load leave.');
    return (data ?? []) as Leave[];
  }

  /**
   * ⚠️  APPROVING LEAVE DOES NOT CANCEL HER APPOINTMENTS.
   *
   * That's deliberate, and it's the most important decision in this feature.
   *
   * If we silently cancelled them, the owner would approve a holiday and six
   * customers would receive cancellation messages she never saw and never chose
   * to send. She'd find out when they turned up angry.
   *
   * Leave blocks FUTURE availability immediately. We then TELL her which
   * existing appointments now conflict. Moving them is her decision, made with
   * her eyes open.
   */
  static async upsertLeave(branchId: string, actor: string, input: {
    id?: string | null;
    staffId: string;
    type: string;
    from: string;
    to: string;
    reason?: string | null;
    status?: string;
  }): Promise<string> {
    if (!input.staffId) throw new ApiError('VALIDATION_FAILED', 'Pick who it\u2019s for.');
    if (!input.from || !input.to) throw new ApiError('VALIDATION_FAILED', 'Pick the dates.');

    const { data, error } = await db().rpc('upsert_leave', {
      p_branch_id: branchId,
      p_id: input.id ?? null,
      p_staff_id: input.staffId,
      p_type: input.type,
      p_from: input.from,
      p_to: input.to,
      p_reason: input.reason ?? null,
      p_status: input.status ?? 'approved',
      p_actor: actor,
    });

    if (error) {
      throw new ApiError('VALIDATION_FAILED',
        (error as { message?: string }).message ?? 'Could not save the leave.');
    }
    return data as string;
  }

  static async setLeaveStatus(
    branchId: string, id: string, status: 'approved' | 'rejected', actor: string,
  ): Promise<void> {
    const { data: staffRow } = await db()
      .from('staff').select('id').eq('user_id', actor).maybeSingle();

    await db().from('staff_leaves')
      .update({
        status,
        reviewed_by: staffRow?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('branch_id', branchId);
  }

  static async removeLeave(branchId: string, id: string): Promise<void> {
    await db().from('staff_leaves')
      .update({ status: 'cancelled' })
      .eq('id', id).eq('branch_id', branchId);
  }

  /* ------------------------------------------------------------- blocks -- */

  static async blocks(branchId: string, from: string, to: string): Promise<Block[]> {
    const { data, error } = await db().rpc('get_blocks', {
      p_branch_id: branchId, p_from: from, p_to: to,
    });
    if (error) throw new ApiError('INTERNAL', 'Could not load blocks.');
    return (data ?? []) as Block[];
  }

  static async createBlock(branchId: string, actor: string, input: {
    staffId: string | null;
    from: string;
    to: string;
    reason: string;
  }): Promise<string> {
    const { data, error } = await db().rpc('create_block', {
      p_branch_id: branchId,
      p_staff_id: input.staffId,
      p_from: input.from,
      p_to: input.to,
      p_reason: input.reason,
      p_actor: actor,
    });
    if (error) {
      throw new ApiError('VALIDATION_FAILED',
        (error as { message?: string }).message ?? 'Could not block that time.');
    }
    return data as string;
  }

  static async removeBlock(branchId: string, id: string): Promise<void> {
    await db().from('schedule_blocks')
      .delete().eq('id', id).eq('branch_id', branchId);
  }

  /* ---------------------------------------------------------- conflicts -- */

  /**
   * "2 appointments are already booked in this time."
   *
   * She should never discover a consequence AFTER committing to it. Before she
   * blocks an hour or approves a holiday, she sees exactly who is affected — by
   * name and time.
   */
  static async conflicts(
    branchId: string, staffId: string | null, from: string, to: string,
  ): Promise<Conflict[]> {
    const { data, error } = await db().rpc('conflicting_appointments', {
      p_branch_id: branchId,
      p_staff_id: staffId,
      p_from: from,
      p_to: to,
    });
    if (error) return [];
    return (data ?? []) as Conflict[];
  }
}
