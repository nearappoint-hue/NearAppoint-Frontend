-- ============================================================================
-- 0008 — Plans & entitlements
--
-- THE DESIGN DECISION THAT MATTERS:
--
--   Entitlements are ROWS, not CODE.
--
-- The obvious way to do this is `if (plan === 'business') { showAnalytics() }`
-- scattered across twenty files. Then marketing wants to move one feature down
-- a tier, and you're grepping for string literals in a codebase, and you miss
-- one, and a Starter customer gets Business features for four months and nobody
-- notices until an accountant does.
--
-- Here, granting a feature is an INSERT. Moving it between plans is an UPDATE.
-- Nothing ships. Nothing is grepped. There is one source of truth and the
-- application asks it a question.
-- ============================================================================

drop table if exists plan_entitlements cascade;
drop table if exists subscription_plans cascade;

create table plans (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,     -- trial | starter | business | enterprise
  name          text not null,
  tagline       text,
  price_monthly numeric(12,2),            -- null = custom pricing (enterprise)
  price_annual  numeric(12,2),
  currency      currency_code not null default 'PKR',
  trial_days    int not null default 0,
  is_public     boolean not null default true,   -- enterprise is "contact us"
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FEATURES — the catalogue of everything that can be gated.
--
-- `is_addon` = purchasable separately, regardless of plan.
-- ---------------------------------------------------------------------------
create table features (
  key           text primary key,         -- 'staff.roles', 'analytics.advanced'
  name          text not null,
  description   text,
  category      text not null,            -- grouping for the pricing page
  is_addon      boolean not null default false,
  display_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- ENTITLEMENTS — which plan gets which feature, and how much of it.
--
-- limit_value semantics:
--   null = unlimited
--   0    = not available (we don't store these; absence means "no")
--   n    = capped at n
-- ---------------------------------------------------------------------------
create table plan_entitlements (
  plan_id     uuid not null references plans(id) on delete cascade,
  feature_key text not null references features(key) on delete cascade,
  limit_value int,
  primary key (plan_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null unique references businesses(id),
  plan_id              uuid not null references plans(id),
  status               text not null default 'trialing'
                         check (status in ('trialing','active','past_due','cancelled','paused')),
  billing_cycle        text not null default 'monthly' check (billing_cycle in ('monthly','annual')),

  trial_ends_at        timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,

  -- Founding salons: ops can extend the trial by hand, WITH A REASON.
  -- (30 days is the default. The first 20 salons get 90, in exchange for
  --  weekly feedback calls. Generosity that buys us something.)
  trial_extended_by    uuid references auth.users(id),
  trial_extension_reason text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_subs_trial_ending on subscriptions(trial_ends_at) where status = 'trialing';
create index idx_subs_past_due     on subscriptions(current_period_end) where status = 'past_due';

-- Per-business add-ons, bought outside the plan.
create table business_addons (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id),
  feature_key   text not null references features(key),
  quantity      int not null default 1,       -- e.g. SMS credits
  status        text not null default 'active' check (status in ('active','expired','cancelled')),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (business_id, feature_key)
);

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id),
  subscription_id uuid references subscriptions(id),
  invoice_number text not null unique,
  period_start   date not null,
  period_end     date not null,
  subtotal       numeric(12,2) not null,
  tax_amount     numeric(12,2) not null default 0,
  total          numeric(12,2) not null,
  currency       currency_code not null default 'PKR',
  status         text not null check (status in ('draft','open','paid','void','uncollectible')),
  due_date       date not null,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- SEED: PLANS
-- ============================================================================
insert into plans (code, name, tagline, price_monthly, price_annual, trial_days, is_public, display_order) values
  ('trial',      'Trial',      'Try everything that matters, free.',        0,    0,     30, true,  1),
  -- 30 days, not 3 months. A business that hasn't reached its first real
  -- Saturday on your calendar in 30 days won't reach it in 90 — you'll just
  -- have spent three months of support finding that out.
  ('starter',    'Starter',    'For a salon that is getting busy.',      2999, 29990,  0, true,  2),
  ('business',   'Business',   'For a salon that is running hard.',      5999, 59990,  0, true,  3),
  ('enterprise', 'Enterprise', 'Multi-branch, franchise, custom.',       null,  null,  0, false, 4);
  -- annual = 10 months' price. Two months free. Standard, and it works.

-- ============================================================================
-- SEED: FEATURES
-- ============================================================================
insert into features (key, name, category, description, is_addon, display_order) values
  -- core (everyone, including trial)
  ('profile.basic',          'Business Profile',        'core', 'Your public page: photos, services, hours', false, 1),
  ('profile.verification',   'Business Verification',   'core', 'Verified badge after document review', false, 2),
  ('services.manage',        'Service Management',      'core', 'Add and price your services', false, 3),
  ('calendar.basic',         'Appointment Calendar',    'core', 'Day and week view', false, 4),
  ('bookings.unlimited',     'Unlimited Bookings',      'core', 'No cap. Ever.', false, 5),
  ('customers.basic',        'Customer Management',     'core', 'Names, numbers, visit history', false, 6),
  -- STAFF MOVED TO TRIAL. A 6-stylist salon cannot use a calendar without
  -- staff on it — gating this behind Starter would have made the trial useless
  -- to the exact businesses we want.
  ('staff.basic',            'Staff Management',        'core', 'Add staff, assign services, set hours', false, 7),
  ('reviews.basic',          'Reviews & Ratings',       'core', 'Collect and reply to reviews', false, 8),
  ('dashboard.basic',        'Basic Dashboard',         'core', 'Today at a glance', false, 9),
  ('analytics.basic',        'Basic Analytics',         'core', 'Bookings, revenue, no-shows', false, 10),
  ('notifications.email',    'Email Notifications',     'core', 'Booking confirmations by email', false, 11),
  -- Transactional WhatsApp is on EVERY plan. It is how customers log in and
  -- how they get reminded. Gating it would break the product, not upsell it.
  ('notifications.whatsapp_transactional', 'WhatsApp Confirmations & Reminders', 'core',
     'Booking confirmations and reminders on WhatsApp', false, 12),
  ('mobile.dashboard',       'Mobile Dashboard',        'core', 'Run the salon from your phone', false, 13),
  ('support.standard',       'Customer Support',        'core', 'Email support', false, 14),

  -- starter+
  ('calendar.advanced',      'Advanced Calendar',       'starter', 'Drag to reschedule, blocks, seasonal hours', false, 20),
  ('customers.crm',          'Customer CRM',            'starter', 'Notes, tags, preferences, lapsed segments', false, 21),
  ('customers.notes',        'Customer Notes',          'starter', '"Allergic to ammonia" — where staff will see it', false, 22),
  ('appointments.history',   'Appointment History',     'starter', 'Full history per customer', false, 23),
  ('analytics.revenue',      'Revenue Dashboard',       'starter', 'Revenue by day, service and staff', false, 24),
  ('reports.business',       'Business Reports',        'starter', 'Exportable reports', false, 25),
  ('notifications.whatsapp_marketing', 'WhatsApp Marketing', 'starter', 'Campaigns and bulk offers', false, 26),
  ('notifications.sms',      'SMS Integration',         'starter', 'SMS fallback (credits sold separately)', false, 27),
  ('marketing.coupons',      'Coupons',                 'starter', 'Discount codes', false, 28),
  ('marketing.offers',       'Promotional Offers',      'starter', 'Fill empty slots with time-limited offers', false, 29),
  ('support.priority_email', 'Priority Email Support',  'starter', 'Faster response', false, 30),

  -- business+
  ('analytics.advanced',     'Advanced Analytics',      'business', 'Peak hours, retention, revenue-per-minute', false, 40),
  ('staff.roles',            'Staff Roles & Permissions','business','Who can see revenue, who can change prices', false, 41),
  ('marketing.loyalty',      'Loyalty Program',         'business', 'Reward repeat customers', false, 42),
  ('marketing.memberships',  'Membership Plans',        'business', 'Recurring packages', false, 43),
  ('marketing.referral',     'Referral Program',        'business', 'Customers bring customers', false, 44),
  ('marketing.campaigns',    'Marketing Campaigns',     'business', 'Segmented campaigns', false, 45),
  ('ai.insights',            'AI Business Insights',    'business', 'What changed, and why', false, 46),
  ('ai.peak_prediction',     'AI Peak Hour Prediction', 'business', 'Staff the right hours', false, 47),
  ('ai.revenue_reports',     'AI Revenue Reports',      'business', 'Narrative reporting', false, 48),
  ('profile.premium',        'Premium Business Profile','business', 'Richer public page', false, 49),
  ('listing.featured_eligible','Featured Listing Eligibility','business','Eligible to be featured', false, 50),
  ('support.phone',          'Phone Support',           'business', 'Call us', false, 51),

  -- enterprise
  ('branches.multi',         'Multi-Branch Management', 'enterprise', 'One dashboard, many branches', false, 60),
  ('branches.franchise',     'Franchise Management',    'enterprise', 'Franchise hierarchy', false, 61),
  ('analytics.branch',       'Branch-wise Analytics',   'enterprise', 'Compare branches', false, 62),
  ('support.dedicated',      'Dedicated Account Manager','enterprise','A human who knows you', false, 63),
  ('api.access',             'API Access',              'enterprise', 'Build on top of us', false, 64),
  ('integrations.custom',    'Custom Integrations',     'enterprise', 'Your systems, connected', false, 65),
  ('reports.advanced',       'Advanced Reports',        'enterprise', 'Whatever you need', false, 66),
  ('roles.custom',           'Custom Roles & Permissions','enterprise','Define your own roles', false, 67),
  ('data.export',            'Data Export',             'enterprise', 'Your data, whenever you want it', false, 68),
  ('support.priority',       'Priority Support',        'enterprise', 'Front of the queue', false, 69),
  ('training.staff',         'Staff Training',          'enterprise', 'We train your team', false, 70),
  ('features.early_access',  'Early Access',            'enterprise', 'New features first', false, 71),

  -- ADD-ONS (bought separately, any plan)
  ('addon.featured_listing', 'Featured Listing',        'addon', 'Top of search results', true, 80),
  ('addon.sponsored',        'Sponsored Business',      'addon', 'Homepage and category promotion', true, 81),
  ('addon.whatsapp_bulk',    'WhatsApp Marketing',      'addon', 'Bulk reminders and campaigns', true, 82),
  ('addon.sms_credits',      'SMS Credits',             'addon', 'Pay as you go', true, 83),
  ('addon.ai_marketing',     'AI Marketing Assistant',  'addon', 'Generate promotions and captions', true, 84),
  ('addon.analytics_pack',   'Advanced Analytics Pack', 'addon', 'Extra business intelligence', true, 85),
  ('addon.gift_cards',       'Gift Card Module',        'addon', 'Sell gift cards', true, 86),
  ('addon.premium_verification','Premium Verification', 'addon', 'Enhanced trust badge', true, 87);

-- ============================================================================
-- SEED: ENTITLEMENTS
--
-- Plans are cumulative: Starter = core + starter, Business = + business, etc.
-- Expressed by category so a new feature lands in the right tiers automatically.
-- ============================================================================

-- TRIAL: everything in 'core'. Nothing withheld that makes the product unusable.
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key,
       case f.key
         when 'staff.basic' then 5           -- trial caps staff at 5. Enough to work.
         else null
       end
  from plans p, features f
 where p.code = 'trial' and f.category = 'core';

-- STARTER: core + starter
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key,
       case f.key when 'staff.basic' then 15 else null end
  from plans p, features f
 where p.code = 'starter' and f.category in ('core','starter');

-- BUSINESS: core + starter + business
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, null
  from plans p, features f
 where p.code = 'business' and f.category in ('core','starter','business');

-- ENTERPRISE: everything except add-ons
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, null
  from plans p, features f
 where p.code = 'enterprise' and f.is_addon = false;

-- ---------------------------------------------------------------------------
-- BRANCH LIMITS
--
-- Multi-branch is Enterprise ONLY, per the pricing doc. Enforced in the DB, so
-- no code path can create a second branch on a Business plan.
-- ---------------------------------------------------------------------------
create or replace function assert_branch_limit()
returns trigger language plpgsql as $$
declare
  n int;
  allowed boolean;
begin
  select count(*) into n from branches
   where business_id = new.business_id and deleted_at is null;

  if n = 0 then return new; end if;   -- first branch always allowed

  select exists (
    select 1 from subscriptions s
      join plan_entitlements pe on pe.plan_id = s.plan_id
     where s.business_id = new.business_id
       and pe.feature_key = 'branches.multi'
       and s.status in ('trialing','active')
  ) into allowed;

  if not allowed then
    raise exception 'Multi-branch requires the Enterprise plan.'
      using errcode = 'check_violation', hint = 'Upgrade to add another branch.';
  end if;

  return new;
end $$;

create trigger t_assert_branch_limit
  before insert on branches
  for each row execute function assert_branch_limit();

-- ---------------------------------------------------------------------------
-- THE ENTITLEMENT QUERY. One function. Every gate in the product calls it.
-- ---------------------------------------------------------------------------
create or replace function has_feature(p_business_id uuid, p_feature_key text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    -- via the plan
    select 1 from subscriptions s
      join plan_entitlements pe on pe.plan_id = s.plan_id
     where s.business_id = p_business_id
       and pe.feature_key = p_feature_key
       and s.status in ('trialing','active')
    union all
    -- or bought as an add-on
    select 1 from business_addons a
     where a.business_id = p_business_id
       and a.feature_key = p_feature_key
       and a.status = 'active'
       and (a.expires_at is null or a.expires_at > now())
  );
$$;

create or replace function feature_limit(p_business_id uuid, p_feature_key text)
returns int
language sql stable security definer set search_path = public as $$
  select pe.limit_value
    from subscriptions s
    join plan_entitlements pe on pe.plan_id = s.plan_id
   where s.business_id = p_business_id
     and pe.feature_key = p_feature_key
     and s.status in ('trialing','active')
   limit 1;
$$;

-- Every new business starts on Trial, 30 days, automatically.
create or replace function start_trial()
returns trigger language plpgsql security definer set search_path = public as $$
declare trial_plan uuid; days int;
begin
  select id, trial_days into trial_plan, days from plans where code = 'trial';

  insert into subscriptions (business_id, plan_id, status, trial_ends_at, current_period_end)
  values (new.id, trial_plan, 'trialing',
          now() + (days || ' days')::interval,
          now() + (days || ' days')::interval);

  return new;
end $$;

create trigger t_start_trial
  after insert on businesses
  for each row execute function start_trial();

alter table plans             enable row level security;
alter table features          enable row level security;
alter table plan_entitlements enable row level security;
alter table subscriptions     enable row level security;
alter table business_addons   enable row level security;
alter table invoices          enable row level security;
alter table invoices          force row level security;

-- The pricing page is public. Plans, features and entitlements are readable.
create policy "plans are public"        on plans             for select to anon, authenticated using (true);
create policy "features are public"     on features          for select to anon, authenticated using (true);
create policy "entitlements are public" on plan_entitlements for select to anon, authenticated using (true);

-- Your own subscription. Nobody else's. Invoices: service role only.
create policy "own subscription" on subscriptions for select
  using (business_id in (select current_business_ids()));
create policy "own addons" on business_addons for select
  using (business_id in (select current_business_ids()));
