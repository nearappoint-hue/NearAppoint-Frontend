import { Plus, Users, Scissors, Clock, ArrowRight } from 'lucide-react';
import { createClient } from '@/server/supabase-server';
import { AccountService } from '@/server/services/account.service';
import { db } from '@/server/database/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = { title: 'Today' };
export const dynamic = 'force-dynamic';

/**
 * TODAY — the screen she opens every morning, forever.
 *
 * Right now she has no services, no staff and no appointments. So this screen
 * has one job: get her set up.
 *
 * NOT a fake dashboard with zeroes in it. An empty revenue chart on day one is
 * a screen that says "this product has nothing for you." The setup checklist
 * says "here is the next thing to do."
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const account = await AccountService.get(user!.id);
  const businessId = account!.businessId!;

  const sb = db();

  const [{ count: serviceCount }, { count: staffCount }, { data: branch }, { data: sub }] =
    await Promise.all([
      sb.from('services').select('id', { count: 'exact', head: true })
        .eq('business_id', businessId).is('deleted_at', null),
      sb.from('staff').select('id', { count: 'exact', head: true })
        .eq('business_id', businessId).is('deleted_at', null).eq('is_bookable', true),
      sb.from('branches').select('id, name, city, area, landmark')
        .eq('business_id', businessId).limit(1).maybeSingle(),
      sb.from('subscriptions').select('status, trial_ends_at, plans(name)')
        .eq('business_id', businessId).maybeSingle(),
    ]);

  const hasServices = (serviceCount ?? 0) > 0;
  const hasStaff    = (staffCount ?? 0) > 0;
  const isSetUp     = hasServices && hasStaff;

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-display text-[0.8rem] font-bold uppercase tracking-wider text-faint">
            {today}
          </p>
          <h1 className="text-[2rem]">Today</h1>
        </div>

        {isSetUp && (
          <Button size="lg">
            <Plus /> Walk-in
          </Button>
        )}
      </div>

      {trialDaysLeft !== null && sub?.status === 'trialing' && (
        <div className="mb-6 rounded border border-brand/25 bg-brand-tint2 px-4 py-3 text-[0.88rem] text-ink">
          <b className="font-display font-bold">{trialDaysLeft} days</b> left on your free trial.
        </div>
      )}

      {!isSetUp ? (
        /* ---------------- SETUP: the only useful thing on day one ---------- */
        <>
          <Card className="mb-6 border-brand/25 bg-brand-tint2">
            <h2 className="mb-2 text-[1.3rem]">Let&apos;s get you set up.</h2>
            <p className="max-w-[52ch] text-[0.93rem] leading-relaxed text-muted">
              Two things and you can start taking bookings. It takes about five
              minutes — and we&apos;ll do it with you.
            </p>
          </Card>

          <div className="space-y-3">
            <SetupStep
              n={1}
              done={hasServices}
              icon={<Scissors className="size-[18px]" />}
              title="Add your services"
              desc="Pick your category and we'll load the usual services with typical durations. Edit the prices and you're done."
              cta="Add services"
              href="/services"
            />
            <SetupStep
              n={2}
              done={hasStaff}
              icon={<Users className="size-[18px]" />}
              title="Add your staff"
              desc="Who works there, what they do, and when. They don't need accounts — they just need to exist on the calendar."
              cta="Add staff"
              href="/staff"
              locked={!hasServices}
            />
          </div>

          {branch && (
            <Card className="mt-8">
              <p className="mb-1 font-display text-[0.72rem] font-bold uppercase tracking-wider text-faint">
                Your branch
              </p>
              <p className="font-display text-[1rem] font-bold">{branch.name}</p>
              {/* Landmark FIRST. "House 42, Street 7" will not get a customer to
                  your door in Lahore. "Opposite Emporium Mall" will. */}
              {branch.landmark && (
                <p className="mt-1 text-[0.88rem] text-ink">{branch.landmark}</p>
              )}
              <p className="text-[0.85rem] text-muted">
                {branch.area}, {branch.city}
              </p>
            </Card>
          )}
        </>
      ) : (
        /* ---------------- THE REAL TODAY VIEW ------------------------------ */
        <Card className="py-16 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-soft text-faint">
            <Clock className="size-6" />
          </div>
          <h2 className="mb-2 text-[1.2rem]">No appointments yet today.</h2>
          <p className="mx-auto mb-6 max-w-[38ch] text-[0.9rem] leading-relaxed text-muted">
            When someone walks in or books, they&apos;ll appear here.
          </p>
          <Button><Plus /> Add a walk-in</Button>
        </Card>
      )}
    </div>
  );
}

function SetupStep({ n, done, icon, title, desc, cta, href, locked }: {
  n: number; done: boolean; icon: React.ReactNode;
  title: string; desc: string; cta: string; href: string; locked?: boolean;
}) {
  return (
    <Card className={locked ? 'opacity-50' : ''}>
      <div className="flex items-start gap-4">
        <span className={`grid size-9 flex-none place-items-center rounded-sm font-display text-[0.85rem] font-bold ${
          done ? 'bg-ok/15 text-ok' : 'bg-brand-tint text-brand'
        }`}>
          {done ? '✓' : n}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 flex items-center gap-2">{icon} {title}</h3>
          <p className="text-[0.87rem] leading-relaxed text-muted">{desc}</p>
        </div>

        {!done && (
          <Button asChild variant="secondary" size="sm" className="flex-none">
            <a href={locked ? '#' : href}>{cta} <ArrowRight /></a>
          </Button>
        )}
      </div>
    </Card>
  );
}
