import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';

/**
 * REVIEWS.
 *
 * ⚠️  A REVIEW REQUIRES A COMPLETED APPOINTMENT. The foreign key enforces it.
 *
 * Not "we check in the API" — it is structurally impossible to review a business
 * you never visited. A rival cannot leave a one-star. A friend cannot leave a
 * five-star. Fake reviews are not discouraged; they are UNREPRESENTABLE.
 *
 * That single constraint is worth more than any moderation system, and it is the
 * entire reason a customer should trust these numbers over Google's.
 */
export interface Pending {
  appointment_id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  cover_url: string | null;
  completed_at: string;
  services: string[];
  staff_id: string | null;
  staff_name: string | null;
}

export interface PublicReview {
  id: string;
  name: string;          // "Sana M." — never the full name, NEVER the phone
  rating: number;
  body: string | null;
  tags: string[] | null;
  staff_name: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface BizReview extends PublicReview {
  services: string[] | null;
}

export const REVIEW_TAGS = [
  'On time',
  'Friendly',
  'Clean & tidy',
  'Great value',
  'Would come back',
] as const;

export class ReviewService {
  /** What can she review? Completed, hers, within 30 days, not already done. */
  static async pending(customerId: string): Promise<Pending[]> {
    const { data } = await db().rpc('reviewable_appointments', {
      p_customer_id: customerId,
    });
    return (data ?? []) as Pending[];
  }

  static async create(input: {
    appointmentId: string;
    customerId: string;
    rating: number;
    body?: string | null;
    tags?: string[];
  }): Promise<string> {
    const { data, error } = await db().rpc('create_review', {
      p_appointment_id: input.appointmentId,
      p_customer_id: input.customerId,
      p_rating: input.rating,
      p_body: input.body ?? null,
      p_tags: input.tags?.length ? input.tags : null,
    });

    if (error) {
      throw new ApiError('VALIDATION_FAILED',
        (error as { message?: string }).message ?? 'Could not post your review.');
    }
    return data as string;
  }

  /** Public list. Truncated names. No phone numbers. Ever. */
  static async publicList(businessId: string, limit = 20, offset = 0) {
    const { data } = await db().rpc('get_business_reviews', {
      p_business_id: businessId,
      p_limit: limit,
      p_offset: offset,
    });
    return data as {
      summary: { avg: number | null; count: number; breakdown: Record<string, number> };
      reviews: PublicReview[];
    };
  }

  /** The owner's view. Full names — they're her customers. */
  static async forBusiness(businessId: string) {
    const { data } = await db().rpc('get_reviews_for_business', {
      p_business_id: businessId,
    });
    return data as {
      stats: { avg: number | null; count: number; reply_rate: number; unanswered: number };
      reviews: BizReview[];
    };
  }

  /**
   * The reply.
   *
   * Replying to reviews — ESPECIALLY the bad ones — is the cheapest trust a
   * business will ever buy. A one-star with a calm, specific reply beneath it
   * reads better to the next customer than no one-star at all.
   */
  static async reply(reviewId: string, businessId: string, reply: string): Promise<void> {
    const { error } = await db().rpc('reply_to_review', {
      p_review_id: reviewId,
      p_business_id: businessId,
      p_reply: reply,
    });
    if (error) throw new ApiError('NOT_FOUND', 'Review not found.');
  }
}
