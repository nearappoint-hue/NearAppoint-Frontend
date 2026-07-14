import { redirect } from 'next/navigation';
import { createClient } from '@/server/supabase-server';
import { AccountService } from '@/server/services/account.service';
import { db } from '@/server/database/client';
import { BusinessSidebar } from '@/components/layout/business-sidebar';

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
    <div className="min-h-screen bg-soft lg:pl-[240px]">
      <BusinessSidebar businessName={business?.display_name ?? 'Your business'} />
      <main className="p-5 lg:p-8">{children}</main>
    </div>
  );
}
