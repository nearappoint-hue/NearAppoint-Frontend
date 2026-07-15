import { redirect } from 'next/navigation';
import { createClient } from '@/server/supabase-server';
import { AccountService } from '@/server/services/account.service';
import { db } from '@/server/database/client';
import { BusinessSidebar } from '@/components/layout/business-sidebar';
import { TopBar } from '@/components/layout/top-bar';

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const account = await AccountService.get(user.id);
  if (!account || account.accountType !== 'business' || !account.businessId) {
    redirect('/home');
  }

  const { data: business } = await db()
    .from('businesses')
    .select('display_name')
    .eq('id', account.businessId)
    .maybeSingle();

  return (
    <div className="min-h-[100dvh] bg-soft lg:pl-[260px]">
      <BusinessSidebar businessName={business?.display_name ?? 'Your business'} />
      <TopBar ownerName={account.fullName ?? 'Owner'} />
      {/* Full width. She's on a wide monitor at a counter; boxing the content
          into 900px in the middle wastes half her screen and makes the calendar
          harder to read than the paper register she's replacing. */}
      <main className="w-full p-5 lg:px-9 lg:py-8">{children}</main>
    </div>
  );
}
