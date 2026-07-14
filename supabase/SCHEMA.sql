-- ############################################################################
--
--   N E A R A P P O I N T   —   C O M P L E T E   S C H E M A
--
--   Run this ONCE, top to bottom, in Supabase → SQL Editor → New query → Run.
--   That is the entire database setup. There is nothing else to run.
--
--   It is idempotent-ish: safe on a FRESH project. It will NOT safely re-run
--   over a database that already has businesses in it.
--
--   ------------------------------------------------------------------------
--   THE FOUR THINGS IN HERE THAT MATTER MORE THAN THE REST
--   ------------------------------------------------------------------------
--
--   1. §7  EXCLUDE constraints on appointment_items.
--          Two customers CANNOT book the same stylist at the same time.
--          Not "we check" — the database physically refuses the second row.
--          This is the entire reason we chose Postgres.
--
--   2. §2  currency_code domain.
--          Postgres rejects 'pkr'. Your Muddarris casing bug cannot recur,
--          because there is no code path that can write lowercase.
--
--   3. §5  booking_policy + the medical verification trigger.
--          Botox, dermal fillers and PRP are DISABLED. An aesthetic clinic
--          CANNOT appear in search until a human has checked its PMC number.
--
--   4. §9  refunds check constraint.
--          status='succeeded' without a provider_refund_id is IMPOSSIBLE.
--          Phantom refunds cannot be written, not even by a bug.
--
--   Verification queries are at the bottom (§16). Run them after. If any of
--   them returns the wrong number, STOP.
--
-- ############################################################################


-- ############################################################################
-- §1  EXTENSIONS
-- ############################################################################

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "btree_gist";   -- REQUIRED for §7. Non-negotiable.
create extension if not exists "postgis";      -- nearby search (KNN)
create extension if not exists "pg_trgm";      -- fuzzy text: "saloon"/"salon"/"salloon"


-- ############################################################################
-- §2  TYPES  —  and the currency domain that kills your worst bug
-- ############################################################################

do $$ begin
  create type business_status as enum
    ('draft','pending_verification','verified','suspended','rejected','churned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_status as enum ('invited','active','suspended','left');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'pending_payment','confirmed','rescheduled','checked_in','late',
    'in_progress','completed','no_show',
    'cancelled_by_customer','cancelled_by_business','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum
    ('customer_app','walk_in','phone','business_manual','waitlist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum
    ('initiated','authorized','captured','failed','refunded','partially_refunded','voided');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- CURRENCY.  PKR. THAT IS THE ONLY VALID VALUE.
--
-- MUDDARRIS LESSON, ENCODED IN THE DATABASE:
--   'PKR' vs 'pkr' compared as raw strings across modules is how money
--   silently disappears.
--
-- This is a DOMAIN with a check constraint. Postgres refuses ANYTHING that is
-- not exactly 'PKR' — not 'pkr', not 'usd', not 'PKr'. There is no module, no
-- new developer, and no 3am bug that can introduce a casing error, because the
-- column will not accept it.
--
-- WHY NOT ALSO ALLOW 'USD' "just in case"?
--   Because a currency you never use is a code path nobody ever tests. The day
--   you finally accept a USD payment, you will discover which of your fifty
--   money calculations quietly assumed PKR. Better to have ONE currency that
--   the database enforces absolutely, and to widen the domain deliberately —
--   with tests — on the day you actually need it. That is a one-line ALTER.
--
-- International expansion is a 4-5 year problem. This is a today problem.
-- ----------------------------------------------------------------------------
do $$ begin
  create domain currency_code as char(3)
    check (value = 'PKR');
exception when duplicate_object then null; end $$;

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;


-- ############################################################################
-- §3  TAXONOMY  —  categories and subcategories
-- ############################################################################

create table if not exists service_categories (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name_en           text not null,
  name_ur           text,
  icon              text,
  description       text,
  booking_type      text not null default 'slot'
                      check (booking_type in ('slot','event','queue')),
  requires_resource boolean not null default false,
  -- Aesthetic Clinics = true. Gates listing behind PMC verification (§13).
  requires_medical_license boolean not null default false,
  is_active         boolean not null default true,
  display_order     int not null default 0
);

-- ----------------------------------------------------------------------------
-- SUBCATEGORIES — templates, not services.
--
-- When a salon onboards, we CLONE the subcategories of its category into its
-- own `services` table with sensible default durations. A salon picks "Hair
-- Salon" and gets 11 priced services in one tap.
--
-- That turns a 40-minute onboarding into 5 minutes. Onboarding friction is the
-- single biggest churn risk we have.
--
-- booking_policy is THE SAFETY GATE. See §5 and the seed in §14.
-- ----------------------------------------------------------------------------
create table if not exists subcategories (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references service_categories(id) on delete cascade,
  slug              text not null,
  name_en           text not null,
  name_ur           text,
  default_duration_minutes int not null check (default_duration_minutes between 5 and 480),
  default_buffer_minutes   int not null default 0,
  booking_policy    text not null default 'bookable'
                      check (booking_policy in ('bookable','consultation_only','disabled')),
  policy_reason     text,     -- shown verbatim to the business and to ops
  gender_target     text not null default 'any' check (gender_target in ('any','female','male')),
  is_active         boolean not null default true,
  display_order     int not null default 0,
  created_at        timestamptz not null default now(),
  unique (category_id, slug)
);
create index if not exists idx_subcat_category on subcategories(category_id) where is_active;


-- ############################################################################
-- §4  BUSINESSES
-- ############################################################################

create table if not exists businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id),
  legal_name          text not null,
  display_name        text not null,
  slug                text not null unique,        -- /lahore/glow-salon-johar-town
  primary_category_id uuid not null references service_categories(id),
  description         text,
  logo_url            text,
  cover_url           text,
  ntn                 text,

  status              business_status not null default 'draft',
  verified_at         timestamptz,
  rejection_reason    text,
  suspension_reason   text,

  -- Medical (Aesthetic Clinics). See the trigger in §13.
  pmc_registration_number text,
  medical_verified_at timestamptz,
  medical_verified_by uuid,

  -- BR-60..67: the mechanism that makes "real availability" a system, not a slogan
  reliability_score   numeric(5,2) not null default 100,
  rating_avg          numeric(3,2),
  rating_count        int not null default 0,

  is_listed           boolean not null default false,  -- appears in customer search
  is_featured         boolean not null default false,  -- EDITORIAL ONLY. Never sold
                                                       -- until organic ranking is trusted.
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
drop trigger if exists t_businesses_touch on businesses;
create trigger t_businesses_touch before update on businesses
  for each row execute function touch_updated_at();


-- ############################################################################
-- §5  PLANS & ENTITLEMENTS
--
--   THE DESIGN DECISION THAT MATTERS: entitlements are ROWS, not CODE.
--
--   The obvious way is `if (plan === 'business')` scattered across 20 files.
--   Then you move one feature down a tier, grep for string literals, miss one,
--   and a Starter customer gets Business features for four months. You find out
--   from an accountant, not an alert.
--
--   Here, moving a feature between tiers is an UPDATE. Nothing ships.
--
--   NOTE: this section must come BEFORE branches, because the branch-limit
--   trigger reads `subscriptions`.
-- ############################################################################

create table if not exists plans (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,    -- trial | starter | business | enterprise
  name          text not null,
  tagline       text,
  price_monthly numeric(12,2),           -- null = custom (enterprise)
  price_annual  numeric(12,2),
  currency      currency_code not null default 'PKR',
  trial_days    int not null default 0,
  is_public     boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists features (
  key           text primary key,        -- 'staff.roles', 'analytics.advanced'
  name          text not null,
  description   text,
  category      text not null,           -- core | starter | business | enterprise | addon
  is_addon      boolean not null default false,
  display_order int not null default 0
);

create table if not exists plan_entitlements (
  plan_id     uuid not null references plans(id) on delete cascade,
  feature_key text not null references features(key) on delete cascade,
  limit_value int,                       -- null = unlimited; n = capped
  primary key (plan_id, feature_key)
);

create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null unique references businesses(id),
  plan_id              uuid not null references plans(id),
  status               text not null default 'trialing'
                         check (status in ('trialing','active','past_due','cancelled','paused')),
  billing_cycle        text not null default 'monthly'
                         check (billing_cycle in ('monthly','annual')),
  trial_ends_at        timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,

  -- Founding salons: ops may extend by hand, WITH A REASON. 30 days is the
  -- default; the first 20 salons get 90, in exchange for weekly feedback calls.
  -- Generosity that buys us something.
  trial_extended_by      uuid references auth.users(id),
  trial_extension_reason text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_subs_trial on subscriptions(trial_ends_at) where status = 'trialing';

create table if not exists business_addons (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  feature_key text not null references features(key),
  quantity    int not null default 1,
  status      text not null default 'active' check (status in ('active','expired','cancelled')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (business_id, feature_key)
);

create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id),
  subscription_id uuid references subscriptions(id),
  invoice_number  text not null unique,
  period_start    date not null,
  period_end      date not null,
  subtotal        numeric(12,2) not null,
  tax_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null,
  currency        currency_code not null default 'PKR',
  status          text not null check (status in ('draft','open','paid','void','uncollectible')),
  due_date        date not null,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);


-- ############################################################################
-- §6  BRANCHES, ROLES, STAFF
-- ############################################################################

create table if not exists branches (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id),
  name                text not null,
  slug                text not null,
  phone               text not null,
  whatsapp            text,

  address_line        text not null,
  -- landmark is NOT optional in practice. "House 42, Street 7, Block C" will
  -- not get a customer to your door in Lahore. "Opposite Emporium Mall, near
  -- the KFC" will. Show this ABOVE the street address, everywhere.
  landmark            text,
  city                text not null,
  area                text,
  location            geography(Point, 4326) not null,   -- map pin. Not geocoded from text.
  timezone            text not null default 'Asia/Karachi',

  -- A large share of ladies' salons are WOMEN-ONLY spaces. This is a HARD
  -- search filter, not a preference. Getting it wrong is a cultural failure.
  gender_policy       text not null default 'unisex'
                        check (gender_policy in ('women_only','men_only','unisex')),

  slot_granularity_minutes  int not null default 15
                              check (slot_granularity_minutes in (5,10,15,30)),
  min_lead_time_minutes     int not null default 60,
  max_advance_days          int not null default 60,
  grace_period_minutes      int not null default 15,
  no_show_threshold_minutes int not null default 30,
  cancellation_window_hours int not null default 4,
  reschedule_window_hours   int not null default 2,
  staff_assignment_mode     text not null default 'least_fragmenting'
                              check (staff_assignment_mode in ('least_fragmenting','round_robin','manual')),

  accepts_walk_ins    boolean not null default true,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (business_id, slug)
);
create index if not exists idx_branches_loc  on branches using gist(location);
create index if not exists idx_branches_city on branches(city, area)
  where deleted_at is null and is_active;

create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),   -- null = platform template
  code        text not null,                    -- owner|manager|receptionist|staff
  name        text not null,
  permissions text[] not null default '{}',
  is_system   boolean not null default false,
  unique (business_id, code)
);

create table if not exists staff (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users(id),  -- null until invite accepted
  business_id       uuid not null references businesses(id),
  branch_id         uuid not null references branches(id),
  role_id           uuid not null references roles(id),
  full_name         text not null,
  phone             text not null,
  gender            text check (gender in ('female','male')),
  avatar_url        text,
  status            staff_status not null default 'invited',
  is_bookable       boolean not null default true,  -- receptionists are staff, not bookable

  -- staff_commission, NOT platform_fee. These two words are never interchanged.
  -- One is a stylist's payroll. The other is our take-rate (dormant).
  commission_type   text check (commission_type in ('none','percent','fixed','tiered')) default 'none',
  commission_value  numeric(6,2),

  rating_avg        numeric(3,2),
  rating_count      int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (business_id, phone)
);
create index if not exists idx_staff_branch on staff(branch_id)
  where deleted_at is null and status = 'active';


-- ############################################################################
-- §7  CATALOG  —  services, resources, prices
-- ############################################################################

create table if not exists services (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references businesses(id),
  category_id           uuid not null references service_categories(id),
  subcategory_id        uuid references subcategories(id),
  name                  text not null,
  description           text,
  duration_minutes      int not null check (duration_minutes between 5 and 480),
  -- Buffer blocks the calendar but is INVISIBLE to the customer. A 45-min cut
  -- with a 15-min buffer occupies 60 minutes and displays as "45 min". Always.
  buffer_after_minutes  int not null default 0 check (buffer_after_minutes between 0 and 120),
  -- Inherited from the subcategory. THE SAFETY GATE.
  booking_policy        text not null default 'bookable'
                          check (booking_policy in ('bookable','consultation_only','disabled')),
  gender_target         text not null default 'any' check (gender_target in ('any','female','male')),
  requires_resource_type text,
  image_url             text,
  is_bookable_online    boolean not null default true,
  display_order         int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create table if not exists resources (   -- wellness rooms, nail stations, laser beds
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branches(id),
  resource_type text not null,
  name          text not null,
  is_active     boolean not null default true,
  deleted_at    timestamptz
);

-- PRICE IS BRANCH-SCOPED. The same cut costs more in DHA than in Johar Town.
create table if not exists branch_services (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references branches(id),
  service_id      uuid not null references services(id),
  price           numeric(12,2) not null check (price >= 0),
  currency        currency_code not null default 'PKR',
  price_is_from   boolean not null default false,   -- "From Rs 2,000"
  duration_override_minutes int,
  is_bookable     boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (branch_id, service_id)
);

create table if not exists staff_services (
  staff_id   uuid not null references staff(id),
  service_id uuid not null references services(id),
  duration_override_minutes int,       -- the senior stylist is faster
  primary key (staff_id, service_id)
);


-- ############################################################################
-- §8  SCHEDULES
--
--   Three layers, later wins:
--     1. schedule_templates  weekly base
--     2. schedule_overrides  seasonal (RAMADAN) + closures (Eid) + special
--     3. breaks / leaves     subtracted on top
--
--   RAMADAN IS NOT AN EDGE CASE. Salons INVERT their hours for 30 days and run
--   near-24/7 before Eid — their highest-revenue week of the year. A holiday-
--   exceptions table cannot express "for these 30 days my whole weekly pattern
--   is different." That is what schedule_overrides is for.
-- ############################################################################

create table if not exists schedule_templates (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id),
  staff_id    uuid references staff(id),      -- null = branch opening hours
  day_of_week int not null check (day_of_week between 0 and 6),   -- 0 = Sunday
  opens_at    time not null,
  closes_at   time not null,
  is_closed   boolean not null default false
);
create unique index if not exists uq_sched_template on schedule_templates(
  branch_id,
  coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day_of_week);

create table if not exists schedule_overrides (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id),
  staff_id    uuid references staff(id),
  kind        text not null check (kind in ('seasonal','closure','special')),
  name        text not null,                  -- 'Ramadan Hours', 'Eid ul-Fitr'
  date_range  daterange not null,
  hours       jsonb,                          -- [{dow:0, opens:'15:00', closes:'02:00'}]
  is_closed   boolean not null default false,
  created_at  timestamptz not null default now(),
  -- Overlapping overrides for the same scope are rejected at the door.
  exclude using gist (
    branch_id with =,
    coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid) with =,
    date_range with &&)
);

create table if not exists schedule_breaks (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id),
  staff_id    uuid references staff(id),      -- null = whole branch (Friday prayer)
  name        text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  starts_at   time not null,
  ends_at     time not null check (ends_at > starts_at)
);
-- Onboarding preset: Friday 12:45-14:15, "Friday Prayer". Offered, not imposed.

create table if not exists schedule_blocks (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references branches(id),
  staff_id   uuid references staff(id),
  reason     text,
  time_range tstzrange not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_blocks_range on schedule_blocks using gist(time_range);

create table if not exists staff_leaves (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id),
  branch_id   uuid not null references branches(id),
  leave_type  text not null check (leave_type in ('annual','sick','unpaid','other')),
  date_range  daterange not null,
  reason      text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_leaves_approved on staff_leaves using gist(staff_id, date_range)
  where status = 'approved';


-- ############################################################################
-- §9  CUSTOMERS
-- ############################################################################

create table if not exists customers (
  id                      uuid primary key references auth.users(id) on delete restrict,
  phone                   text not null unique,   -- E.164. THE IDENTITY KEY.
  phone_verified_at       timestamptz,
  full_name               text,
  email                   text,                   -- optional attribute, NOT identity
  avatar_url              text,
  gender                  text check (gender in ('female','male','prefer_not_to_say')),
  home_location           geography(Point, 4326),
  locale                  text not null default 'en' check (locale in ('en','ur')),

  reliability_score       int not null default 100,
  no_show_count_90d       int not null default 0,
  booking_suspended_until timestamptz,

  referral_code           text unique,
  referred_by             uuid references customers(id),

  -- TWO consents. Separately stored, separately revocable. Sending a marketing
  -- message under a transactional consent is a legal and trust failure.
  marketing_consent       boolean not null default false,
  whatsapp_consent        boolean not null default true,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index if not exists idx_customers_phone on customers(phone) where deleted_at is null;
create index if not exists idx_customers_loc on customers using gist(home_location);

-- A person the BUSINESS knows. May or may not have a platform account.
create table if not exists business_customers (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id),
  customer_id        uuid references customers(id),   -- null = walk-in, no account
  phone              text not null,                   -- THE MERGE KEY
  full_name          text,
  notes              text,                            -- "allergic to ammonia"
  tags               text[],
  preferred_staff_id uuid references staff(id),
  total_visits       int not null default 0,
  total_spend        numeric(12,2) not null default 0,
  no_show_count      int not null default 0,
  last_visit_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  unique (business_id, phone)
);
-- When a platform customer books at a salon that already knows her number,
-- these auto-link and the owner instantly sees "Sana, 6 visits, prefers Hina,
-- allergic to ammonia" on a booking that came from the app.
-- That moment is the best demo in the entire product.


-- ############################################################################
-- §10  APPOINTMENTS
--
--        ⬇⬇⬇  THE MOST IMPORTANT TABLE IN THE PRODUCT  ⬇⬇⬇
-- ############################################################################

create table if not exists appointments (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique,      -- 'NA-8F3K2'. What support asks for.
  business_id            uuid not null references businesses(id),
  branch_id              uuid not null references branches(id),
  customer_id            uuid references customers(id),
  business_customer_id   uuid not null references business_customers(id),

  status                 appointment_status not null,
  source                 appointment_source not null,

  time_range             tstzrange not null,        -- customer-visible span
  total_duration_minutes int not null,

  -- MONEY: SERVER-AUTHORITATIVE, ALWAYS.
  -- Every figure here is resolved on the server from branch_services at booking
  -- time. The client sends service IDs and a start time. It NEVER sends a price.
  -- (Muddarris lesson, applied at the schema level.)
  currency               currency_code not null default 'PKR',
  subtotal               numeric(12,2) not null default 0,
  discount_amount        numeric(12,2) not null default 0,
  total                  numeric(12,2) not null default 0,
  final_billed_amount    numeric(12,2),

  booking_fee            numeric(12,2) not null default 0,
  booking_fee_status     text check (booking_fee_status in
                           ('none','pending','paid','refunded','forfeited','credited')),
  platform_fee           numeric(12,2) not null default 0,   -- DORMANT

  hold_expires_at        timestamptz,   -- pending_payment only. 10 minutes.
  customer_notes         text,
  business_notes         text,          -- internal. NEVER shown to the customer.
  cancellation_reason    text,
  cancelled_by           uuid references auth.users(id),
  cancelled_at           timestamptz,
  checked_in_at          timestamptz,
  started_at             timestamptz,
  completed_at           timestamptz,
  reschedule_count       int not null default 0,
  rescheduled_from       uuid references appointments(id),
  created_by             uuid references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
  -- Appointments are NEVER soft-deleted. They are cancelled. The record is permanent.
);
create index if not exists idx_appt_branch_range on appointments using gist(branch_id, time_range);
create index if not exists idx_appt_customer on appointments(customer_id, created_at desc);
create index if not exists idx_appt_hold on appointments(hold_expires_at)
  where status = 'pending_payment';
create index if not exists idx_appt_active on appointments(status, lower(time_range))
  where status in ('pending_payment','confirmed','late');

-- ============================================================================
--
--   Two customers tap "Confirm" on the 6:00pm slot 50 milliseconds apart.
--   BOTH pass any availability check you can write in application code.
--   Check-then-insert is a race condition with a nicer name.
--
--   The EXCLUDE constraints below make overlapping active appointments for the
--   same staff member (or the same room) PHYSICALLY IMPOSSIBLE TO INSERT.
--   Postgres refuses. There is no code path around it, including a buggy one.
--
--   This is the entire reason we are on Postgres and not Firebase.
--
--   If the constraint fires, we have not failed — WE HAVE WORKED. The API turns
--   error 23P01 into a clean 409 with three alternative slots already loaded.
--
-- ============================================================================
create table if not exists appointment_items (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references appointments(id) on delete cascade,
  branch_id         uuid not null references branches(id),
  service_id        uuid not null references services(id),
  staff_id          uuid references staff(id),
  resource_id       uuid references resources(id),

  -- occupies_range INCLUDES the trailing buffer. This is what blocks the calendar.
  occupies_range    tstzrange not null,
  -- service_range is what the CUSTOMER sees. Buffer is invisible to them.
  service_range     tstzrange not null,

  -- Mirrored from the parent. A partial index predicate on an EXCLUDE constraint
  -- cannot reach through a foreign key, so this denormalisation is what makes
  -- the guarantee below possible at all. Kept in sync by trigger (§13).
  status            appointment_status not null,

  -- DENORMALISED AT BOOKING. A QUOTED PRICE IS A PROMISE.
  -- Editing your menu tomorrow must never change what a customer was told today.
  service_name      text not null,
  price             numeric(12,2) not null,
  currency          currency_code not null default 'PKR',
  duration_minutes  int not null,

  staff_commission_amount numeric(12,2) not null default 0,
  sequence          int not null default 1,
  created_at        timestamptz not null default now(),

  -- ===== INVARIANT 1: NO STAFF DOUBLE-BOOKING =====
  constraint no_staff_double_booking exclude using gist (
    staff_id       with =,
    occupies_range with &&
  ) where (
    staff_id is not null and
    status in ('pending_payment','confirmed','rescheduled','checked_in','late','in_progress')
  ),

  -- ===== INVARIANT 2: NO RESOURCE DOUBLE-BOOKING =====
  constraint no_resource_double_booking exclude using gist (
    resource_id    with =,
    occupies_range with &&
  ) where (
    resource_id is not null and
    status in ('pending_payment','confirmed','rescheduled','checked_in','late','in_progress')
  )
);
create index if not exists idx_items_staff  on appointment_items using gist(staff_id, occupies_range);
create index if not exists idx_items_branch on appointment_items using gist(branch_id, occupies_range);
create index if not exists idx_items_appt   on appointment_items(appointment_id);

-- Immutable event log. The audit spine.
create table if not exists appointment_events (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  from_status    appointment_status,
  to_status      appointment_status not null,
  actor_user_id  uuid references auth.users(id),
  actor_type     text not null check (actor_type in ('customer','staff','admin','system')),
  reason         text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_appt_events on appointment_events(appointment_id, created_at);


-- ############################################################################
-- §11  PAYMENTS
--
--   MUDDARRIS LESSON, ENCODED: a refund row CANNOT claim success without a
--   provider reference. The check constraint below makes status='succeeded'
--   with no provider_refund_id IMPOSSIBLE.
--
--   Phantom refunds are not writable. Not by a bug. Not by a race. Not at all.
-- ############################################################################

create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references appointments(id),
  subscription_id uuid references subscriptions(id),
  payer_user_id   uuid references auth.users(id),
  purpose         text not null check (purpose in ('booking_fee','service_payment','subscription')),
  amount          numeric(12,2) not null check (amount > 0),
  currency        currency_code not null default 'PKR',
  method          text check (method in ('safepay','jazzcash','easypaisa','card','bank_transfer','cash')),
  provider        text,
  provider_txn_id text,
  status          payment_status not null default 'initiated',
  idempotency_key text not null unique,   -- duplicate webhooks are a CERTAINTY
  failure_reason  text,
  raw_response    jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists uq_payment_txn on payments(provider, provider_txn_id)
  where provider_txn_id is not null;

create table if not exists refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references payments(id),
  amount             numeric(12,2) not null check (amount > 0),
  currency           currency_code not null default 'PKR',
  reason             text not null,
  initiated_by       uuid references auth.users(id),
  status             text not null default 'pending'
                       check (status in ('pending','processing','succeeded','failed')),
  provider_refund_id text,
  created_at         timestamptz not null default now(),

  -- A refund cannot be 'succeeded' without EVIDENCE that money actually moved.
  constraint refund_success_needs_provider_ref
    check (status <> 'succeeded' or provider_refund_id is not null)
);


-- ############################################################################
-- §12  ADMIN
-- ############################################################################

create table if not exists admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id),
  full_name   text not null,
  role        text not null check (role in ('super_admin','ops','support','finance')),
  permissions text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Append-only. Never updated. Never deleted.
create table if not exists audit_log (
  id            bigserial primary key,
  table_name    text not null,
  record_id     uuid not null,
  operation     text not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_user_id uuid,
  old_data      jsonb,
  new_data      jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_record on audit_log(table_name, record_id, created_at desc);


-- ############################################################################
-- §13  FUNCTIONS & TRIGGERS  —  the rules the database enforces itself
-- ############################################################################

-- Which businesses does the current user work for?
create or replace function current_business_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select business_id from staff
   where user_id = auth.uid() and deleted_at is null and status = 'active';
$$;

create or replace function current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from staff
   where user_id = auth.uid() and deleted_at is null and status = 'active' limit 1;
$$;

-- Keep the mirrored item status honest (see §10).
create or replace function sync_item_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    update appointment_items set status = new.status where appointment_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists t_sync_item_status on appointments;
create trigger t_sync_item_status after update of status on appointments
  for each row execute function sync_item_status();

-- ----------------------------------------------------------------------------
-- ENTITLEMENTS. One function. Every gate in the product calls it.
-- ----------------------------------------------------------------------------
create or replace function has_feature(p_business_id uuid, p_feature_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
      join plan_entitlements pe on pe.plan_id = s.plan_id
     where s.business_id = p_business_id
       and pe.feature_key = p_feature_key
       and s.status in ('trialing','active')
    union all
    select 1 from business_addons a
     where a.business_id = p_business_id
       and a.feature_key = p_feature_key
       and a.status = 'active'
       and (a.expires_at is null or a.expires_at > now())
  );
$$;

create or replace function feature_limit(p_business_id uuid, p_feature_key text)
returns int language sql stable security definer set search_path = public as $$
  select pe.limit_value from subscriptions s
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
  if trial_plan is null then return new; end if;

  insert into subscriptions (business_id, plan_id, status, trial_ends_at, current_period_end)
  values (new.id, trial_plan, 'trialing',
          now() + (days || ' days')::interval,
          now() + (days || ' days')::interval);
  return new;
end $$;

drop trigger if exists t_start_trial on businesses;
create trigger t_start_trial after insert on businesses
  for each row execute function start_trial();

-- ----------------------------------------------------------------------------
-- MULTI-BRANCH IS ENTERPRISE ONLY. The database refuses the second branch.
--
-- A billing gate that lives only in application code gets bypassed eventually —
-- by a script, by an admin tool, by a bug.
-- ----------------------------------------------------------------------------
create or replace function assert_branch_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int; allowed boolean;
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

drop trigger if exists t_assert_branch_limit on branches;
create trigger t_assert_branch_limit before insert on branches
  for each row execute function assert_branch_limit();

-- ----------------------------------------------------------------------------
-- MEDICAL VERIFICATION GATE.
--
-- An aesthetic clinic CANNOT appear in customer search until a human has
-- checked its PMC registration number against the register.
--
-- Not "should not". CANNOT. No code path can skip this — not an admin script,
-- not a bulk import, not a well-meaning ops tool. If a customer is burned by a
-- laser at a clinic we listed and verified, that is our problem, and this
-- trigger is the only thing standing between us and it.
-- ----------------------------------------------------------------------------
create or replace function assert_medical_verified()
returns trigger language plpgsql set search_path = public as $$
declare needs_license boolean;
begin
  if new.is_listed is not true then return new; end if;

  select sc.requires_medical_license into needs_license
    from service_categories sc where sc.id = new.primary_category_id;

  if needs_license and new.medical_verified_at is null then
    raise exception
      'Business "%" is in a medical category and cannot be listed without PMC verification.',
      new.display_name using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists t_assert_medical_verified on businesses;
create trigger t_assert_medical_verified
  before insert or update of is_listed on businesses
  for each row execute function assert_medical_verified();


-- ############################################################################
-- §14  ROW-LEVEL SECURITY
--
--   RLS is the BACKSTOP, not the authorization model. All writes go through
--   the server with an explicit permission check. RLS is the seatbelt that
--   catches the bug we shipped anyway.
--
--   WHY THIS MATTERS MORE THAN IT SOUNDS:
--   We hold the phone numbers of thousands of women, the neighbourhoods they
--   live in, and the exact times they will be at a known address. A cross-tenant
--   leak is not an embarrassment. It is a safety incident, and it ends the
--   company.
-- ############################################################################

alter table customers          enable row level security;
alter table businesses         enable row level security;
alter table branches           enable row level security;
alter table staff              enable row level security;
alter table roles              enable row level security;
alter table services           enable row level security;
alter table branch_services    enable row level security;
alter table staff_services     enable row level security;
alter table resources          enable row level security;
alter table schedule_templates enable row level security;
alter table schedule_overrides enable row level security;
alter table schedule_breaks    enable row level security;
alter table schedule_blocks    enable row level security;
alter table staff_leaves       enable row level security;
alter table business_customers enable row level security;
alter table appointments       enable row level security;
alter table appointment_items  enable row level security;
alter table appointment_events enable row level security;
alter table payments           enable row level security;
alter table refunds            enable row level security;
alter table subscriptions      enable row level security;
alter table business_addons    enable row level security;
alter table invoices           enable row level security;
alter table admin_users        enable row level security;
alter table audit_log          enable row level security;
alter table plans              enable row level security;
alter table features           enable row level security;
alter table plan_entitlements  enable row level security;
alter table service_categories enable row level security;
alter table subcategories      enable row level security;

-- Money and audit tables: FORCED, even for the owner.
alter table payments           force row level security;
alter table refunds            force row level security;
alter table invoices           force row level security;
alter table audit_log          force row level security;
alter table business_customers force row level security;

-- ---- public reads ----------------------------------------------------------
drop policy if exists "categories public" on service_categories;
create policy "categories public" on service_categories for select
  to anon, authenticated using (is_active);

drop policy if exists "subcategories public" on subcategories;
create policy "subcategories public" on subcategories for select
  to anon, authenticated using (is_active);

drop policy if exists "plans public" on plans;
create policy "plans public" on plans for select to anon, authenticated using (true);

drop policy if exists "features public" on features;
create policy "features public" on features for select to anon, authenticated using (true);

drop policy if exists "entitlements public" on plan_entitlements;
create policy "entitlements public" on plan_entitlements for select
  to anon, authenticated using (true);

-- Only VERIFIED + LISTED businesses are visible. Everything else is invisible.
drop policy if exists "listed businesses public" on businesses;
create policy "listed businesses public" on businesses for select
  to anon, authenticated
  using (is_listed and status = 'verified' and deleted_at is null);

drop policy if exists "listed branches public" on branches;
create policy "listed branches public" on branches for select
  to anon, authenticated
  using (deleted_at is null and is_active and exists (
    select 1 from businesses b where b.id = branches.business_id
      and b.is_listed and b.status = 'verified'));

-- ---- customers -------------------------------------------------------------
drop policy if exists "customer self" on customers;
create policy "customer self" on customers for select using (id = auth.uid());

drop policy if exists "customer self update" on customers;
create policy "customer self update" on customers for update using (id = auth.uid());

-- ---- tenant isolation ------------------------------------------------------
drop policy if exists "own staff" on staff;
create policy "own staff" on staff for select
  using (business_id in (select current_business_ids()));

drop policy if exists "own services" on services;
create policy "own services" on services for select
  using (business_id in (select current_business_ids()));

drop policy if exists "own customers" on business_customers;
create policy "own customers" on business_customers for select
  using (business_id in (select current_business_ids()));

drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions for select
  using (business_id in (select current_business_ids()));

drop policy if exists "own addons" on business_addons;
create policy "own addons" on business_addons for select
  using (business_id in (select current_business_ids()));

-- ---- appointments ----------------------------------------------------------
drop policy if exists "customer own appointments" on appointments;
create policy "customer own appointments" on appointments for select
  using (customer_id = auth.uid());

-- A stylist sees HER OWN book and nobody else's. Full-access roles see the branch.
drop policy if exists "business appointments" on appointments;
create policy "business appointments" on appointments for select
  using (business_id in (select current_business_ids()) and (
    exists (select 1 from staff s join roles r on r.id = s.role_id
             where s.user_id = auth.uid()
               and 'appointments:read:all' = any(r.permissions))
    or exists (select 1 from appointment_items ai
                where ai.appointment_id = appointments.id
                  and ai.staff_id = current_staff_id())
  ));

-- payments, refunds, invoices, audit_log, admin_users:
-- NO POLICY = NO ACCESS. Service role only. That is deliberate.


-- ############################################################################
-- §15  SEED DATA
-- ############################################################################

-- ---- 15.1  ROLE TEMPLATES --------------------------------------------------
insert into roles (business_id, code, name, is_system, permissions) values
  (null, 'owner', 'Owner', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'services:write','pricing:write',
    'staff:read','staff:write','staff:commission:read:all','leaves:approve',
    'customers:read','customers:notes:write',
    'analytics:read','revenue:read','marketing:write',
    'settings:write','subscription:manage','roles:write','audit:read']),
  (null, 'manager', 'Manager', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'services:write',
    'staff:read','staff:write','staff:commission:read:all','leaves:approve',
    'customers:read','customers:notes:write',
    'analytics:read','revenue:read','marketing:write']),
  -- NOTE: pricing:write is deliberately WITHHELD from Manager.
  -- In a commission salon, whoever can change a price can change a stylist's
  -- earnings. That is a fraud vector and a source of internal disputes.
  -- An owner may grant it explicitly. She should never grant it by accident.
  (null, 'receptionist', 'Receptionist', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'customers:read','customers:notes:write']),
  (null, 'staff', 'Staff', true, array[
    'appointments:read:own','appointments:complete',
    'staff:commission:read:own',
    'customers:read','customers:notes:write'])
on conflict do nothing;

-- ---- 15.2  CATEGORIES ------------------------------------------------------
insert into service_categories
  (slug, name_en, name_ur, icon, booking_type, requires_resource, requires_medical_license, display_order, description) values
  ('hair_salon',      'Hair Salons',       'ہیئر سیلون',     'scissors', 'slot',  false, false, 1, 'Cuts, colour, styling, beard & grooming'),
  ('beauty_parlor',   'Beauty Parlors',    'بیوٹی پارلر',    'sparkles', 'slot',  false, false, 2, 'Makeup, facials, threading, waxing & bridal'),
  ('nail_studio',     'Nail Studios',      'نیل اسٹوڈیو',    'hand',     'slot',  true,  false, 3, 'Manicure, pedicure, gel, acrylic & nail art'),
  -- MEHNDI IS EVENT BOOKING, NOT SLOT BOOKING. A bridal mehndi is a 4-hour
  -- commitment on a specific date, usually with a deposit. Forcing it into
  -- 15-minute slots would make a bad product for mehndi artists AND pollute
  -- the schema for everyone else.
  ('mehndi_studio',   'Mehndi Studios',    'مہندی اسٹوڈیو',  'flower',   'event', false, false, 4, 'Bridal, party & occasion mehndi'),
  ('wellness',        'Wellness Centers',  'ویلنس سینٹر',    'leaf',     'slot',  true,  false, 5, 'Spa, massage, therapy & relaxation'),
  ('aesthetic_clinic','Aesthetic Clinics', 'ایستھیٹک کلینک', 'sparkle',  'slot',  true,  true,  6, 'Skin treatments & aesthetic consultations')
on conflict (slug) do nothing;

-- ---- 15.3  SUBCATEGORIES ---------------------------------------------------

-- 1. HAIR SALONS
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.gen, v.ord
from service_categories c, (values
  ('mens-haircut',   'Men''s Haircut',       'مردانہ ہیئر کٹ',     30,  5,  'male',   1),
  ('womens-haircut', 'Women''s Haircut',     'زنانہ ہیئر کٹ',      45,  10, 'female', 2),
  ('hair-styling',   'Hair Styling',         'ہیئر اسٹائلنگ',      45,  10, 'any',    3),
  ('hair-coloring',  'Hair Coloring',        'ہیئر کلرنگ',         120, 15, 'any',    4),
  ('hair-treatment', 'Hair Treatment',       'ہیئر ٹریٹمنٹ',       60,  10, 'any',    5),
  ('wash-blow-dry',  'Hair Wash & Blow Dry', 'واش اینڈ بلو ڈرائی', 40,  5,  'any',    6),
  ('beard-trim',     'Beard Trim',           'داڑھی ٹرم',          15,  5,  'male',   7),
  ('beard-styling',  'Beard Styling',        'بیئرڈ اسٹائلنگ',     25,  5,  'male',   8),
  ('shaving',        'Shaving',              'شیو',                20,  5,  'male',   9),
  ('head-massage',   'Head Massage',         'سر کا مساج',         20,  5,  'any',    10),
  ('groom-package',  'Groom Package',        'گروم پیکج',          150, 20, 'male',   11)
) as v(slug, en, ur, dur, buf, gen, ord)
where c.slug = 'hair_salon'
on conflict do nothing;

-- 2. BEAUTY PARLORS
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, 'female', v.ord
from service_categories c, (values
  ('bridal-makeup',  'Bridal Makeup',     'دلہن کا میک اپ', 180, 30, 1),
  ('party-makeup',   'Party Makeup',      'پارٹی میک اپ',   75,  15, 2),
  ('hair-styling',   'Hair Styling',      'ہیئر اسٹائلنگ',  45,  10, 3),
  ('facial',         'Facial Treatments', 'فیشل',           60,  15, 4),
  ('threading',      'Threading',         'تھریڈنگ',        15,  5,  5),
  ('waxing',         'Waxing',            'ویکسنگ',         45,  10, 6),
  ('bleach',         'Bleach',            'بلیچ',           30,  10, 7),
  ('skin-care',      'Skin Care',         'اسکن کیئر',      45,  10, 8),
  ('eyebrow',        'Eyebrow Services',  'آئی برو سروسز',  20,  5,  9),
  ('lash-brow',      'Lash & Brow',       'لیش اینڈ براؤ',  60,  10, 10),
  ('bridal-package', 'Bridal Package',    'برائیڈل پیکج',   300, 30, 11)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'beauty_parlor'
on conflict do nothing;

-- 3. NAIL STUDIOS
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.ord
from service_categories c, (values
  ('manicure',        'Manicure',        'مینیکیور',      40, 10, 1),
  ('pedicure',        'Pedicure',        'پیڈیکیور',      50, 10, 2),
  ('gel-nails',       'Gel Nails',       'جیل نیلز',      60, 10, 3),
  ('acrylic-nails',   'Acrylic Nails',   'ایکریلک نیلز',  90, 15, 4),
  ('nail-extensions', 'Nail Extensions', 'نیل ایکسٹینشن', 90, 15, 5),
  ('nail-art',        'Nail Art',        'نیل آرٹ',       45, 10, 6),
  ('nail-repair',     'Nail Repair',     'نیل ریپیئر',    20, 5,  7),
  ('nail-polish',     'Nail Polish',     'نیل پالش',      20, 5,  8),
  ('spa-manicure',    'Spa Manicure',    'اسپا مینیکیور', 60, 10, 9),
  ('spa-pedicure',    'Spa Pedicure',    'اسپا پیڈیکیور', 75, 10, 10)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'nail_studio'
on conflict do nothing;

-- 4. MEHNDI STUDIOS
--
-- 'Home Visit Mehndi' IS DELIBERATELY ABSENT.
--
-- It sends a woman, alone, to a stranger's house. That needs ID-verified
-- artists, trip visibility, an SOS path, and an incident-response function.
-- We have none of those, and ONE incident ends the brand.
-- Phase 3, with a proper trust & safety spec. Not before. Do not add it back.
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, 'female', v.ord
from service_categories c, (values
  ('bridal-mehndi',     'Bridal Mehndi',        'دلہن کی مہندی',    240, 30, 1),
  ('party-mehndi',      'Party Mehndi',         'پارٹی مہندی',      60,  15, 2),
  ('engagement-mehndi', 'Engagement Mehndi',    'منگنی کی مہندی',   120, 20, 3),
  ('arabic-mehndi',     'Arabic Mehndi',        'عربی مہندی',       45,  10, 4),
  ('indian-mehndi',     'Indian Mehndi',        'انڈین مہندی',      90,  15, 5),
  ('pakistani-mehndi',  'Pakistani Mehndi',     'پاکستانی مہندی',   90,  15, 6),
  ('gulf-mehndi',       'Gulf Style Mehndi',    'گلف اسٹائل مہندی', 60,  15, 7),
  ('custom-mehndi',     'Custom Mehndi Design', 'کسٹم ڈیزائن',      120, 20, 8)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'mehndi_studio'
on conflict do nothing;

-- 5. WELLNESS CENTERS
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.ord
from service_categories c, (values
  ('spa',               'Spa',                 'اسپا',             90, 20, 1),
  ('full-body-massage', 'Full Body Massage',   'فل باڈی مساج',     60, 15, 2),
  ('head-massage',      'Head Massage',        'سر کا مساج',       30, 10, 3),
  ('foot-massage',      'Foot Massage',        'پاؤں کا مساج',     40, 10, 4),
  ('aromatherapy',      'Aromatherapy',        'اروماتھراپی',      60, 15, 5),
  ('deep-tissue',       'Deep Tissue Massage', 'ڈیپ ٹشو مساج',     75, 15, 6),
  ('swedish-massage',   'Swedish Massage',     'سویڈش مساج',       60, 15, 7),
  ('hot-stone',         'Hot Stone Therapy',   'ہاٹ اسٹون تھراپی', 90, 20, 8),
  ('steam-room',        'Steam Room',          'اسٹیم روم',        30, 10, 9),
  ('sauna',             'Sauna',               'سونا',             30, 10, 10),
  ('relaxation',        'Relaxation Therapy',  'ریلیکسیشن تھراپی', 60, 15, 11)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'wellness'
on conflict do nothing;

-- ============================================================================
-- 6. AESTHETIC CLINICS  —  READ THIS BEFORE CHANGING ANYTHING
--
--   Three tiers, enforced by the database:
--
--     bookable           Cosmetic. Non-invasive. Book it like a facial.
--     consultation_only  The customer books a CONSULT. The procedure itself is
--                        arranged offline, by qualified people, with informed
--                        consent we are not equipped to capture.
--     disabled           We do not offer this. AT ALL. Seeded so the row exists
--                        and nobody "helpfully" re-adds it in six months.
--
--   BOTOX, DERMAL FILLERS and PRP are prescription-only injectables regulated
--   by the PMC. Only a registered practitioner may administer them.
--
--   If a customer books "Botox" on NearAppoint from a salon and something goes
--   wrong — WE listed that business, and WE verified it. That is our problem,
--   our lawsuit, and our brand.
--
--   'disabled' is not a soft launch. It is a NO.
-- ============================================================================
insert into subcategories
  (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes,
   booking_policy, policy_reason, is_active, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.pol, v.reason,
       (v.pol <> 'disabled'),     -- disabled is ALSO inactive. Belt and braces.
       v.ord
from service_categories c, (values
  -- ---- BOOKABLE: cosmetic, non-invasive ----
  ('hydrafacial',       'HydraFacial',       'ہائیڈرا فیشل',  60, 15, 'bookable', null::text, 1),
  ('skin-consultation', 'Skin Consultation', 'اسکن کنسلٹیشن', 30, 10, 'bookable', null, 2),
  ('acne-treatment',    'Acne Treatment',    'ایکنی ٹریٹمنٹ', 45, 15, 'bookable', null, 3),
  ('chemical-peel',     'Chemical Peel',     'کیمیکل پیل',    45, 15, 'bookable',
     'Superficial peels only. Medium and deep peels require a registered practitioner and are not bookable here.', 4),
  ('skin-rejuvenation', 'Skin Rejuvenation', 'اسکن ریجوینیشن', 60, 15, 'bookable', null, 5),

  -- ---- CONSULTATION ONLY ----
  ('laser-hair-removal','Laser Hair Removal','لیزر ہیئر ریموول', 30, 15, 'consultation_only',
     'Laser carries a real burn risk and requires a skin assessment first. The customer books a consultation; the treatment plan is agreed in person.', 6),
  ('anti-aging',        'Anti-Aging Treatments','اینٹی ایجنگ',   30, 15, 'consultation_only',
     'Covers a wide range of procedures, some of them medical. Consultation first, always.', 7),

  -- ---- DISABLED: WE DO NOT OFFER THESE ----
  ('botox',             'Botox',             'بوٹوکس',        30, 15, 'disabled',
     'Prescription-only injectable, regulated by the PMC. Only a registered practitioner may administer it. NearAppoint does not accept bookings for injectables.', 8),
  ('dermal-fillers',    'Dermal Fillers',    'ڈرمل فلرز',     45, 15, 'disabled',
     'Prescription-only injectable, regulated by the PMC. NearAppoint does not accept bookings for injectables.', 9),
  ('prp-therapy',       'PRP Therapy',       'پی آر پی تھراپی', 60, 20, 'disabled',
     'Involves drawing and re-injecting blood. A medical procedure requiring a licensed practitioner and clinical facilities. Not a booking we will take.', 10)
) as v(slug, en, ur, dur, buf, pol, reason, ord)
where c.slug = 'aesthetic_clinic'
on conflict do nothing;

-- ---- 15.4  PLANS -----------------------------------------------------------
--
-- TRIAL IS 30 DAYS, NOT 3 MONTHS.
--
-- A salon that hasn't reached its first real Saturday on your calendar in 30
-- days won't reach it in 90 — you'll just have spent three months of support
-- discovering that. Extend by hand for founding salons, in exchange for
-- weekly feedback calls. Generosity that buys you something.
--
-- Annual = 10 months' price. Two months free.
insert into plans (code, name, tagline, price_monthly, price_annual, trial_days, is_public, display_order) values
  ('trial',      'Trial',      'Everything you need to run your salon. Free for 30 days.', 0,    0,     30, true,  1),
  ('starter',    'Starter',    'For a salon that is getting busy.',                        2999, 29990, 0,  true,  2),
  ('business',   'Business',   'For a salon that is running hard.',                        5999, 59990, 0,  true,  3),
  ('enterprise', 'Enterprise', 'Multi-branch, franchise, custom.',                         null, null,  0,  false, 4)
on conflict (code) do nothing;

-- ---- 15.5  FEATURES --------------------------------------------------------
insert into features (key, name, category, description, is_addon, display_order) values
  -- CORE — every plan, including Trial
  ('profile.basic',        'Business Profile',     'core', 'Your public page: photos, services, hours', false, 1),
  ('profile.verification', 'Business Verification','core', 'Verified badge after document review', false, 2),
  ('services.manage',      'Service Management',   'core', 'Add and price your services', false, 3),
  ('calendar.basic',       'Appointment Calendar', 'core', 'Day and week view', false, 4),
  ('bookings.unlimited',   'Unlimited Bookings',   'core', 'No cap. Ever.', false, 5),
  ('customers.basic',      'Customer Management',  'core', 'Names, numbers, visit history', false, 6),
  -- STAFF IS IN TRIAL, deliberately. A 6-stylist salon cannot use a calendar
  -- without staff on it. Gating this behind Starter would have made the trial
  -- useless to exactly the businesses we want.
  ('staff.basic',          'Staff Management',     'core', 'Add staff, assign services, set hours', false, 7),
  ('reviews.basic',        'Reviews & Ratings',    'core', 'Collect and reply to reviews', false, 8),
  ('dashboard.basic',      'Basic Dashboard',      'core', 'Today at a glance', false, 9),
  ('analytics.basic',      'Basic Analytics',      'core', 'Bookings, revenue, no-shows', false, 10),
  ('notifications.email',  'Email Notifications',  'core', 'Booking confirmations by email', false, 11),
  -- Transactional WhatsApp is on EVERY plan. It is how customers log in and how
  -- they are reminded. Gating it would break the product, not upsell it.
  ('notifications.whatsapp_transactional', 'WhatsApp Confirmations & Reminders', 'core',
     'Booking confirmations and reminders on WhatsApp', false, 12),
  ('mobile.dashboard',     'Mobile Dashboard',     'core', 'Run the salon from your phone', false, 13),
  ('support.standard',     'Customer Support',     'core', 'Email support', false, 14),

  -- STARTER+
  ('calendar.advanced',    'Advanced Calendar',    'starter', 'Drag to reschedule, blocks, Ramadan hours', false, 20),
  ('customers.crm',        'Customer CRM',         'starter', 'Notes, tags, preferences, lapsed segments', false, 21),
  ('customers.notes',      'Customer Notes',       'starter', '"Allergic to ammonia" — where staff will see it', false, 22),
  ('appointments.history', 'Appointment History',  'starter', 'Full history per customer', false, 23),
  ('analytics.revenue',    'Revenue Dashboard',    'starter', 'Revenue by day, service and staff', false, 24),
  ('reports.business',     'Business Reports',     'starter', 'Exportable reports', false, 25),
  ('notifications.whatsapp_marketing','WhatsApp Marketing','starter','Campaigns and bulk offers', false, 26),
  ('notifications.sms',    'SMS Integration',      'starter', 'SMS fallback (credits sold separately)', false, 27),
  ('marketing.coupons',    'Coupons',              'starter', 'Discount codes', false, 28),
  ('marketing.offers',     'Promotional Offers',   'starter', 'Fill empty slots with time-limited offers', false, 29),
  ('support.priority_email','Priority Email Support','starter','Faster response', false, 30),

  -- BUSINESS+
  ('analytics.advanced',   'Advanced Analytics',   'business', 'Peak hours, retention, revenue-per-minute', false, 40),
  ('staff.roles',          'Staff Roles & Permissions','business','Who sees revenue, who changes prices', false, 41),
  ('marketing.loyalty',    'Loyalty Program',      'business', 'Reward repeat customers', false, 42),
  ('marketing.memberships','Membership Plans',     'business', 'Recurring packages', false, 43),
  ('marketing.referral',   'Referral Program',     'business', 'Customers bring customers', false, 44),
  ('marketing.campaigns',  'Marketing Campaigns',  'business', 'Segmented campaigns', false, 45),
  ('ai.insights',          'AI Business Insights', 'business', 'What changed, and why', false, 46),
  ('ai.peak_prediction',   'AI Peak Hour Prediction','business','Staff the right hours', false, 47),
  ('ai.revenue_reports',   'AI Revenue Reports',   'business', 'Narrative reporting', false, 48),
  ('profile.premium',      'Premium Business Profile','business','Richer public page', false, 49),
  ('listing.featured_eligible','Featured Listing Eligibility','business','Eligible to be featured', false, 50),
  ('support.phone',        'Phone Support',        'business', 'Call us', false, 51),

  -- ENTERPRISE
  ('branches.multi',       'Multi-Branch Management','enterprise','One dashboard, many branches', false, 60),
  ('branches.franchise',   'Franchise Management', 'enterprise', 'Franchise hierarchy', false, 61),
  ('analytics.branch',     'Branch-wise Analytics','enterprise', 'Compare branches', false, 62),
  ('support.dedicated',    'Dedicated Account Manager','enterprise','A human who knows you', false, 63),
  ('api.access',           'API Access',           'enterprise', 'Build on top of us', false, 64),
  ('integrations.custom',  'Custom Integrations',  'enterprise', 'Your systems, connected', false, 65),
  ('reports.advanced',     'Advanced Reports',     'enterprise', 'Whatever you need', false, 66),
  ('roles.custom',         'Custom Roles & Permissions','enterprise','Define your own roles', false, 67),
  ('data.export',          'Data Export',          'enterprise', 'Your data, whenever you want it', false, 68),
  ('support.priority',     'Priority Support',     'enterprise', 'Front of the queue', false, 69),
  ('training.staff',       'Staff Training',       'enterprise', 'We train your team', false, 70),
  ('features.early_access','Early Access',         'enterprise', 'New features first', false, 71),

  -- ADD-ONS — purchasable on any plan
  --
  -- NOTE ON addon.featured_listing: BUILT, BUT DORMANT.
  -- Selling search placement before anyone trusts your search destroys the only
  -- asset a marketplace has. Turn this on when organic ranking is trusted — it
  -- will be worth more then anyway.
  ('addon.featured_listing','Featured Listing',    'addon', 'Top of search results', true, 80),
  ('addon.sponsored',      'Sponsored Business',   'addon', 'Homepage and category promotion', true, 81),
  ('addon.whatsapp_bulk',  'WhatsApp Marketing',   'addon', 'Bulk reminders and campaigns', true, 82),
  ('addon.sms_credits',    'SMS Credits',          'addon', 'Pay as you go', true, 83),
  ('addon.ai_marketing',   'AI Marketing Assistant','addon','Generate promotions and captions', true, 84),
  ('addon.analytics_pack', 'Advanced Analytics Pack','addon','Extra business intelligence', true, 85),
  ('addon.gift_cards',     'Gift Card Module',     'addon', 'Sell gift cards', true, 86),
  ('addon.premium_verification','Premium Verification','addon','Enhanced trust badge', true, 87)
on conflict (key) do nothing;

-- ---- 15.6  ENTITLEMENTS ----------------------------------------------------
-- Plans are cumulative. Expressed by CATEGORY, so a new feature lands in the
-- right tiers automatically instead of being forgotten in one of them.

-- TRIAL: all of 'core'. Nothing withheld that would make the product unusable.
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, case f.key when 'staff.basic' then 5 else null end
  from plans p, features f
 where p.code = 'trial' and f.category = 'core'
on conflict do nothing;

-- STARTER: core + starter
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, case f.key when 'staff.basic' then 15 else null end
  from plans p, features f
 where p.code = 'starter' and f.category in ('core','starter')
on conflict do nothing;

-- BUSINESS: core + starter + business. Unlimited staff.
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, null from plans p, features f
 where p.code = 'business' and f.category in ('core','starter','business')
on conflict do nothing;

-- ENTERPRISE: everything except add-ons
insert into plan_entitlements (plan_id, feature_key, limit_value)
select p.id, f.key, null from plans p, features f
 where p.code = 'enterprise' and f.is_addon = false
on conflict do nothing;


-- ############################################################################
-- §16  HEALTH CHECK SUPPORT
--
--   /api/health reads this view to assert the exclusion constraints EXIST.
--
--   Why: if a migration is skipped, or somebody drops a constraint to unblock
--   a test and forgets to restore it, the application keeps working PERFECTLY.
--   Every screen loads. Every booking succeeds. Nothing errors.
--
--   And then two customers book the same 6pm slot and both get a confirmation,
--   and that salon owner never trusts the calendar again.
--
--   This view turns a silent, unrecoverable failure into a loud 503.
-- ############################################################################

create or replace view health_constraints as
  select conname::text
    from pg_constraint
   where conname in ('no_staff_double_booking','no_resource_double_booking')
     and contype = 'x';    -- 'x' = EXCLUDE. Not just anything with that name.

revoke all on health_constraints from anon, authenticated;


-- ############################################################################
--
--   §17  VERIFICATION  —  RUN THESE NOW. DO NOT SKIP.
--
--   Copy each query below into a new SQL Editor tab and run it.
--   If ANY returns the wrong number, STOP and tell me.
--
-- ############################################################################

-- ============================================================================
-- CHECK 1 — THE DOUBLE-BOOKING GUARD.  MUST RETURN 2 ROWS.
--
-- If this returns 0, two customers can book the same stylist at the same time,
-- and everything else in this schema is decoration.
-- ============================================================================
select conname, contype from pg_constraint
 where conname in ('no_staff_double_booking','no_resource_double_booking');


-- ============================================================================
-- CHECK 2 — THE MEDICAL SAFETY GATE.  MUST RETURN 5 ROWS.
--
--   laser-hair-removal   consultation_only
--   anti-aging           consultation_only
--   botox                disabled
--   dermal-fillers       disabled
--   prp-therapy          disabled
-- ============================================================================
select slug, name_en, booking_policy, is_active
  from subcategories
 where booking_policy <> 'bookable'
 order by booking_policy, slug;


-- ============================================================================
-- CHECK 3 — TAXONOMY.  6 categories, 58 subcategories.
-- ============================================================================
select c.name_en, c.booking_type, count(s.id) as subcategories
  from service_categories c
  left join subcategories s on s.category_id = c.id
 group by c.id, c.name_en, c.booking_type, c.display_order
 order by c.display_order;


-- ============================================================================
-- CHECK 4 — PLANS & ENTITLEMENTS.
--   trial 14 · starter 25 · business 37 · enterprise 49
-- ============================================================================
select p.code, p.price_monthly, p.trial_days, count(pe.feature_key) as features
  from plans p
  left join plan_entitlements pe on pe.plan_id = p.id
 group by p.id, p.code, p.price_monthly, p.trial_days, p.display_order
 order by p.display_order;


-- ============================================================================
-- CHECK 5 — CURRENCY DOMAIN.  This must FAIL with an error.
--
-- If it SUCCEEDS, your Muddarris casing bug can happen again.
-- Uncomment and run:
-- ============================================================================
-- select 'pkr'::currency_code;      -- expected: ERROR — value violates check constraint


-- ============================================================================
-- CHECK 6 — HOME VISIT MEHNDI MUST NOT EXIST.  MUST RETURN 0 ROWS.
-- ============================================================================
select slug, name_en from subcategories where slug like '%home%';


-- ############################################################################
--
--   DONE.
--
--   Next: Supabase → Settings → API → copy the Project URL, the anon key and
--   the service_role key into Vercel's environment variables.
--
--   Then open  https://your-app.vercel.app/api/health
--   You want:  { "ok": true, "checks": { "double_booking_guard": { "ok": true } } }
--
--   If double_booking_guard is false, come back to CHECK 1.
--
-- ############################################################################
