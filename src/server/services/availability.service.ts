import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';

/**
 * AVAILABILITY.
 *
 * Derived, never stored. It is a pure function of hours, overrides, breaks,
 * leave and existing appointments.
 *
 * Storing "free slots" as rows would mean maintaining them on every booking,
 * cancellation and hours change — and the first time that maintenance misses
 * one, the calendar starts lying. A lying calendar is the one thing that kills
 * this product.
 */
export interface Slot {
  start_at: string;
  staff_id: string;
  staff_name: string;
}

export class AvailabilityService {
  static async slots(
    branchId: string, serviceIds: string[], date: string, staffId?: string | null,
  ): Promise<Slot[]> {
    if (!serviceIds.length) return [];

    const { data, error } = await db().rpc('get_available_slots', {
      p_branch_id:   branchId,
      p_service_ids: serviceIds,
      p_date:        date,
      p_staff_id:    staffId ?? null,
    });

    if (error) {
      console.error('[availability]', error);
      throw new ApiError('INTERNAL', 'Could not work out what\u2019s free.');
    }

    return (data as any[] ?? []).map(r => ({
      start_at: new Date(r.slot_start).toISOString(),
      staff_id: r.staff_id,
      staff_name: r.staff_name,
    }));
  }

  /**
   * Group slots by TIME, listing who's free at each.
   *
   * The receptionist thinks "is 4pm free?", not "is Hina free?". Showing 40
   * rows of (time, stylist) pairs is a list. Showing 20 times, each with the
   * people available, is an answer.
   */
  static group(slots: Slot[]) {
    const byTime = new Map<string, Slot[]>();
    for (const s of slots) {
      const list = byTime.get(s.start_at) ?? [];
      list.push(s);
      byTime.set(s.start_at, list);
    }
    return [...byTime.entries()]
      .map(([time, list]) => ({
        start_at: time,
        staff: list.map(s => ({ id: s.staff_id, name: s.staff_name })),
      }))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }
}
