-- ============================================================================
-- 0002 — Identity, businesses, branches, catalog, schedules
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CUSTOMERS. Phone is the identity key (ADR-008), not email.
-- ---------------------------------------------------------------------------
create table customers (
  id                      uuid primary key references auth.users(id) on delete restrict,
  phone                   text not null unique,          -- E.164: +923001234567
  phone_verified_at       timestamptz,
  full_name               text,
  email                   text,                          -- optional attribute, NOT identity
  avatar_url              text,
  gender                  text check (gender in ('female','male','prefer_not_to_say')),
  home_location           geography(Point, 4326),
  locale                  text not null default 'en' check (locale in ('en','ur')),

  -- reliability (BR-70..76)
  reliability_score       int not null default 100,
  no_show_count_90d       int not null default 0,
  booking_suspended_until timestamptz,

  referral_code           text unique,
  referred_by             uuid references customers(id),

  -- Two consents. Separately stored, separately revocable. Sending marketing
  -- under a transactional consent is a legal and trust failure.
  marketing_consent       boolean not null default false,
  whatsapp_consent        boolean not null default true,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index idx_customers_phone on customers(phone) where deleted_at is null;
create index idx_customers_loc   on customers using gist(home_location);

-- ---------------------------------------------------------------------------
-- BUSINESSES
-- ---------------------------------------------------------------------------
create table businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id),
  legal_name          text not null,
  display_name        text not null,
  slug                text not null unique,      -- /lahore/glow-salon-johar-town
  description         text,
  logo_url            text,
  cover_url           text,
  ntn                 text,
  status              business_status not null default 'draft',
  verified_at         timestamptz,
  rejection_reason    text,
  suspension_reason   text,
  reliability_score   numeric(5,2) not null default 100,   -- BR-60..67
  rating_avg          numeric(3,2),
  rating_count        int not null default 0,
  is_listed           boolean not null default false,      -- appears in customer search
  is_featured         boolean not null default false,      -- editorial only. Never sold.
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create trigger t_businesses_touch before update on businesses
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- BRANCHES. The unit of scheduling.
-- ---------------------------------------------------------------------------
create table branches (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id),
  name                text not null,
  slug                text not null,
  phone               text not null,
  whatsapp            text,

  address_line        text not null,
  -- landmark is NOT optional in practice. "House 42, Street 7, Block C" will
  -- not get a customer to your door in Lahore. "Opposite Emporium Mall, near
  -- the KFC" will. Surface this above the street address, everywhere.
  landmark            text,
  city                text not null,
  area                text,
  location            geography(Point, 4326) not null,   -- map pin. Not geocoded from text.

  timezone            text not null default 'Asia/Karachi',

  -- A large share of ladies' salons are women-only spaces. This is a HARD
  -- search filter, not a preference. Getting it wrong is a cultural failure,
  -- not a bug.
  gender_policy       text not null default 'unisex'
                        check (gender_policy in ('women_only','men_only','unisex')),

  -- booking rules (BR-03..BR-31). Defaults here; bounded in the API.
  slot_granularity_minutes  int not null default 15 check (slot_granularity_minutes in (5,10,15,30)),
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
create index idx_branches_loc  on branches using gist(location);
create index idx_branches_city on branches(city, area) where deleted_at is null and is_active;
create trigger t_branches_touch before update on branches
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- ROLES & STAFF
-- ---------------------------------------------------------------------------
create table roles (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id),   -- null = platform default template
  code          text not null,                    -- owner | manager | receptionist | staff
  name          text not null,
  permissions   text[] not null default '{}',
  is_system     boolean not null default false,
  unique (business_id, code)
);

create table staff (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users(id),   -- null until invite accepted
  business_id       uuid not null references businesses(id),
  branch_id         uuid not null references branches(id),
  role_id           uuid not null references roles(id),
  full_name         text not null,
  phone             text not null,
  gender            text check (gender in ('female','male')),
  avatar_url        text,
  status            staff_status not null default 'invited',
  is_bookable       boolean not null default true,   -- receptionists are staff, not bookable

  -- staff_commission, NOT platform_fee. These two words are never interchanged.
  commission_type   text check (commission_type in ('none','percent','fixed','tiered')) default 'none',
  commission_value  numeric(6,2),

  rating_avg        numeric(3,2),
  rating_count      int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (business_id, phone)
);
create index idx_staff_branch on staff(branch_id) where deleted_at is null and status = 'active';
create trigger t_staff_touch before update on staff
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- CATALOG
-- ---------------------------------------------------------------------------
create table service_categories (
  id             uuid primary key default gen_random_uuid(),
  parent_id      uuid references service_categories(id),
  slug           text not null unique,
  name_en        text not null,
  name_ur        text,
  -- booking_type keeps mehndi (event) and clinics (queue) additive later,
  -- instead of a schema rewrite. ADR-003.
  booking_type   text not null default 'slot' check (booking_type in ('slot','event','queue')),
  requires_resource boolean not null default false,
  is_active      boolean not null default true,
  display_order  int not null default 0
);

create table services (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references businesses(id),
  category_id           uuid not null references service_categories(id),
  name                  text not null,
  description           text,
  duration_minutes      int not null check (duration_minutes between 5 and 480),
  -- Buffer blocks the calendar but is INVISIBLE to the customer. A 45-min cut
  -- with a 15-min buffer occupies 60 min and displays as "45 min". Always.
  buffer_after_minutes  int not null default 0 check (buffer_after_minutes between 0 and 120),
  gender_target         text not null default 'any' check (gender_target in ('any','female','male')),
  requires_resource_type text,
  image_url             text,
  is_bookable_online    boolean not null default true,
  display_order         int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create table resources (          -- wellness rooms, nail stations
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branches(id),
  resource_type text not null,
  name          text not null,
  is_active     boolean not null default true,
  deleted_at    timestamptz
);

-- PRICE IS BRANCH-SCOPED. The same cut costs more in DHA than in Johar Town.
create table branch_services (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references branches(id),
  service_id      uuid not null references services(id),
  price           numeric(12,2) not null check (price >= 0),
  currency        currency_code not null default 'PKR',
  price_is_from   boolean not null default false,
  duration_override_minutes int,
  is_bookable     boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (branch_id, service_id)
);

create table staff_services (
  staff_id    uuid not null references staff(id),
  service_id  uuid not null references services(id),
  duration_override_minutes int,     -- the senior stylist is faster
  primary key (staff_id, service_id)
);

-- ---------------------------------------------------------------------------
-- SCHEDULES — three layers, later wins:
--   1. schedule_templates  weekly base
--   2. schedule_overrides  seasonal (Ramadan) + closures (Eid) + special (Chaand Raat)
--   3. schedule_breaks / staff_leaves  subtracted on top
-- ---------------------------------------------------------------------------
create table schedule_templates (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references branches(id),
  staff_id     uuid references staff(id),      -- null = branch opening hours
  day_of_week  int not null check (day_of_week between 0 and 6),
  opens_at     time not null,
  closes_at    time not null,
  is_closed    boolean not null default false
);
create unique index uq_sched_template on schedule_templates(
  branch_id,
  coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day_of_week
);

-- ADR-010. Salons INVERT their hours for 30 days in Ramadan and run near-24/7
-- before Eid — their highest-revenue week of the year. A holiday-exceptions
-- table cannot express "for these 30 days my whole weekly pattern is different".
create table schedule_overrides (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id),
  staff_id    uuid references staff(id),
  kind        text not null check (kind in ('seasonal','closure','special')),
  name        text not null,                   -- 'Ramadan Hours', 'Eid ul-Fitr'
  date_range  daterange not null,
  hours       jsonb,                           -- [{dow:0, opens:'15:00', closes:'02:00'}, ...]
  is_closed   boolean not null default false,
  created_at  timestamptz not null default now(),

  -- Overlapping overrides for the same scope are rejected at the door (E13).
  exclude using gist (
    branch_id with =,
    coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid) with =,
    date_range with &&
  )
);

create table schedule_breaks (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references branches(id),
  staff_id     uuid references staff(id),      -- null = whole branch (Friday prayer)
  name         text not null,
  day_of_week  int not null check (day_of_week between 0 and 6),
  starts_at    time not null,
  ends_at      time not null check (ends_at > starts_at)
);
-- Onboarding preset: Friday 12:45-14:15, "Friday Prayer". Offered, not imposed.

create table staff_leaves (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id),
  branch_id   uuid not null references branches(id),
  leave_type  text not null check (leave_type in ('annual','sick','unpaid','other')),
  date_range  daterange not null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_leaves_approved on staff_leaves using gist(staff_id, date_range)
  where status = 'approved';
