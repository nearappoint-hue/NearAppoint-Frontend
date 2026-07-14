import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';
import { toE164, isValidPkMobile } from '@/lib/phone';

/**
 * CUSTOMERS.
 *
 * This is the module that makes the subscription worth paying for. A calendar
 * is replaceable. "Sana, 12 visits, allergic to ammonia, prefers Hina" is not
 * something she can rebuild if she leaves us.
 */
export interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string;
  total_visits: number;
  total_spend: number;
  last_visit_at: string | null;
  notes: string | null;
  tags: string[] | null;
}

export interface Visit {
  id: string;
  reference: string;
  date: string;
  services: string[];
  staff_name: string | null;
  total: number;
  status: string;
}

export class CustomerService {
  static async search(businessId: string, query: string, limit = 50, offset = 0) {
    const { data, error } = await db().rpc('search_customers', {
      p_business_id: businessId,
      p_query: query || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new ApiError('INTERNAL', 'Could not search your customers.');
    return (data ?? []) as CustomerRow[];
  }

  static async count(businessId: string): Promise<number> {
    const { count } = await db()
      .from('business_customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .is('deleted_at', null);
    return count ?? 0;
  }

  /** Her history with this business. Not her life story — just what happened here. */
  static async history(businessId: string, customerId: string): Promise<Visit[]> {
    const { data } = await db()
      .from('appointments')
      .select(`
        id, reference, status, total, time_range,
        appointment_items ( service_name, staff ( full_name ) )
      `)
      .eq('business_id', businessId)
      .eq('business_customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(25);

    return (data ?? []).map((a: Record<string, any>) => ({
      id: a.id,
      reference: a.reference,
      date: firstDate(a.time_range),
      services: (a.appointment_items ?? []).map((i: any) => i.service_name),
      staff_name: a.appointment_items?.[0]?.staff?.full_name ?? null,
      total: Number(a.total),
      status: a.status,
    }));
  }

  static async create(businessId: string, input: {
    fullName: string | null; phone: string; notes: string | null;
  }): Promise<string> {
    if (!isValidPkMobile(input.phone)) {
      throw new ApiError('VALIDATION_FAILED',
        'That doesn\u2019t look like a Pakistani mobile number.');
    }

    const { data, error } = await db()
      .from('business_customers')
      .insert({
        business_id: businessId,
        phone: toE164(input.phone),
        full_name: input.fullName?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select('id').single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ApiError('VALIDATION_FAILED', 'You already have a customer with that number.');
      }
      throw new ApiError('INTERNAL', 'Could not add them.');
    }
    return data.id;
  }

  static async update(customerId: string, patch: {
    fullName?: string | null; notes?: string | null; tags?: string[];
  }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.fullName !== undefined) update.full_name = patch.fullName?.trim() || null;
    if (patch.notes !== undefined)    update.notes = patch.notes?.trim() || null;
    if (patch.tags !== undefined)     update.tags = patch.tags;

    if (!Object.keys(update).length) return;
    await db().from('business_customers').update(update).eq('id', customerId);
  }
}

function firstDate(range: string | null): string {
  if (!range) return '';
  const m = range.match(/^[\[(]"?([^",]+)"?,/);
  return m ? new Date(m[1]!).toISOString() : '';
}
