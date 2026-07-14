import 'server-only';
import { db } from '@/server/database/client';

/**
 * WHO IS THIS PERSON, AND WHERE DO THEY BELONG?
 *
 * account_type is the FRONT DOOR they came in:
 *   customer  signed up with Google on the public site
 *   business  we created this account by hand, in their shop
 *   admin     us
 *
 * This is NOT the `roles` table. `roles` is permissions INSIDE a business —
 * a receptionist may take bookings but must not see revenue. Different question,
 * different table. Conflating them produces a permission model nobody can
 * reason about, and those are how one business ends up reading another's
 * customer list.
 */
export type AccountType = 'customer' | 'business' | 'admin';

export interface Account {
  userId: string;
  accountType: AccountType;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  businessId: string | null;
  mustChangePassword: boolean;
}

export class AccountService {
  static async get(userId: string): Promise<Account | null> {
    const { data } = await db()
      .from('user_profiles')
      .select('id, account_type, full_name, email, avatar_url, business_id, must_change_password')
      .eq('id', userId)
      .maybeSingle();

    if (!data) return null;

    return {
      userId: data.id,
      accountType: data.account_type as AccountType,
      fullName: data.full_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      businessId: data.business_id,
      mustChangePassword: data.must_change_password,
    };
  }

  /** Where this account belongs after login. */
  static homeFor(account: Account): string {
    if (account.mustChangePassword) return '/change-password';
    switch (account.accountType) {
      case 'business': return '/today';
      case 'admin':    return '/admin';
      default:         return '/home';
    }
  }
}
