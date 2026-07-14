import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';

/**
 * SEASONAL HOURS.
 *
 * Ramadan is not an edge case.
 *
 * She INVERTS her entire schedule for thirty days — opening mid-afternoon,
 * running past midnight. The three days before Eid are the highest-revenue
 * period of her year, and Chaand Raat is the single biggest night.
 *
 * A weekly template cannot express "for these thirty days, my whole pattern is
 * different." That is what this is for. The business that misses it loses its
 * biggest week, and blames us.
 */
export interface Override {
  id: string;
  kind: 'seasonal' | 'closure' | 'special';
  name: string;
  from: string;
  to: string;
  hours: { dow: number; opens: string; closes: string }[] | null;
  is_closed: boolean;
  is_active: boolean;
}

export class OverrideService {
  static async list(branchId: string): Promise<Override[]> {
    const { data } = await db()
      .from('schedule_overrides')
      .select('id, kind, name, date_range, hours, is_closed')
      .eq('branch_id', branchId)
      .is('staff_id', null)
      .order('created_at', { ascending: false });

    const today = new Date().toISOString().slice(0, 10);

    return (data ?? []).map((o: Record<string, any>) => {
      const [from, to] = parseDateRange(o.date_range);
      return {
        id: o.id,
        kind: o.kind,
        name: o.name,
        from, to,
        hours: o.hours,
        is_closed: o.is_closed,
        is_active: from <= today && today <= to,
      };
    });
  }

  static async upsert(branchId: string, input: {
    id?: string | null;
    kind: 'seasonal' | 'closure' | 'special';
    name: string;
    from: string;
    to: string;
    hours: { dow: number; opens: string; closes: string }[] | null;
    isClosed: boolean;
  }): Promise<string> {
    if (!input.name.trim()) throw new ApiError('VALIDATION_FAILED', 'Give it a name.');
    if (!input.from || !input.to) throw new ApiError('VALIDATION_FAILED', 'Pick the dates.');

    const { data, error } = await db().rpc('upsert_schedule_override', {
      p_branch_id: branchId,
      p_id: input.id ?? null,
      p_kind: input.kind,
      p_name: input.name.trim(),
      p_from: input.from,
      p_to: input.to,
      p_hours: input.hours,
      p_is_closed: input.isClosed,
    });

    if (error) {
      // The EXCLUDE constraint refuses overlapping date ranges. She cannot have
      // "Ramadan Hours" and "Eid" both claiming the same day — an ambiguous
      // schedule is a lying calendar.
      throw new ApiError('VALIDATION_FAILED',
        (error as { message?: string }).message ?? 'Those dates overlap with another schedule.');
    }
    return data as string;
  }

  static async remove(branchId: string, id: string): Promise<void> {
    await db().from('schedule_overrides')
      .delete().eq('id', id).eq('branch_id', branchId);
  }
}

function parseDateRange(r: string): [string, string] {
  const m = r?.match(/^[\[(]([^,]+),([^\])]+)[\])]$/);
  if (!m) return ['', ''];
  const from = m[1]!.replace(/"/g, '');
  let to = m[2]!.replace(/"/g, '');
  // Postgres normalises daterange to half-open [a,b). Show her the inclusive day.
  if (r.endsWith(')')) {
    const d = new Date(to);
    d.setDate(d.getDate() - 1);
    to = d.toISOString().slice(0, 10);
  }
  return [from, to];
}
