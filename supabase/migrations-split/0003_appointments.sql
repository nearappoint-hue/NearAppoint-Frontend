-- ============================================================================
-- 0003 — APPOINTMENTS
--
-- This migration contains the single most important thing in the codebase.
-- Read the EXCLUDE constraints below before you change anything in here.
-- ============================================================================

create table business_customers (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id),
  customer_id       uuid references customers(id),   -- null = walk-in, no account
  phone             text not null,                   -- THE MERGE KEY
  full_name         text,
  notes             text,                            -- "allergic to ammonia"
  tags              text[],
  preferred_staff_id uuid references staff(id),
  total_visits      int not null default 0,
  total_spend       numeric(12,2) not null default 0,
  no_show_count     int not null default 0,
  last_visit_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (business_id, phone)
);
-- When a platform customer books at a business that already knows her phone
-- number, these auto-link and the owner instantly sees "Sana, 6 visits, prefers
-- Hina, allergic to ammonia" on a booking that came from the app.
-- That moment is the best demo in the entire product. Build it early.

create table appointments (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,        -- 'NA-8F3K2' — what support gets on WhatsApp
  business_id           uuid not null references businesses(id),
  branch_id             uuid not null references branches(id),
  customer_id           uuid references customers(id),
  business_customer_id  uuid not null references business_customers(id),

  status                appointment_status not null,
  source                appointment_source not null,

  time_range            tstzrange not null,          -- customer-visible span
  total_duration_minutes int not null,

  -- ===== MONEY: server-authoritative, always =====
  -- Every figure below is resolved on the server from branch_services at
  -- booking time. The client sends service IDs and a start time. Nothing else.
  -- It NEVER sends a price. (Muddarris lesson, applied at the schema level.)
  currency              currency_code not null default 'PKR',
  subtotal              numeric(12,2) not null default 0,
  discount_amount       numeric(12,2) not null default 0,
  total                 numeric(12,2) not null default 0,
  final_billed_amount   numeric(12,2),               -- what was ACTUALLY charged

  booking_fee           numeric(12,2) not null default 0,   -- ADR-002
  booking_fee_status    text check (booking_fee_status in
                          ('none','pending','paid','refunded','forfeited','credited')),
  platform_fee          numeric(12,2) not null default 0,   -- DORMANT in MVP

  hold_expires_at       timestamptz,                 -- pending_payment only. 10 min.
  customer_notes        text,
  business_notes        text,                        -- internal. NEVER shown to the customer.
  cancellation_reason   text,
  cancelled_by          uuid references auth.users(id),
  cancelled_at          timestamptz,
  checked_in_at         timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  reschedule_count      int not null default 0,
  rescheduled_from      uuid references appointments(id),
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
  -- Appointments are NEVER soft-deleted. They are cancelled. The record is permanent.
);
create index idx_appt_branch_range on appointments using gist(branch_id, time_range);
create index idx_appt_customer     on appointments(customer_id, created_at desc);
create index idx_appt_hold         on appointments(hold_expires_at) where status = 'pending_payment';
create index idx_appt_active       on appointments(status, lower(time_range))
  where status in ('pending_payment','confirmed','late');
create trigger t_appt_touch before update on appointments
  for each row execute function touch_updated_at();


-- ============================================================================
--                    ⬇⬇⬇  THE MOST IMPORTANT TABLE  ⬇⬇⬇
--
-- Two customers tap "Confirm" on the 6:00pm slot 50ms apart. Both pass any
-- application-level availability check you can write. Check-then-insert is a
-- race condition with a nicer name.
--
-- The EXCLUDE constraints below make overlapping active appointments for the
-- same staff member (or the same room) PHYSICALLY IMPOSSIBLE TO INSERT.
-- Postgres refuses. There is no code path around it, including a buggy one.
--
-- This is the entire reason we are on Postgres and not Firebase.
-- If the constraint fires, we have not failed — we have worked. The API turns
-- 23P01 into a clean 409 with three alternative slots already loaded.
-- ============================================================================
create table appointment_items (
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

  -- Mirrored from the parent because a partial index predicate on an EXCLUDE
  -- constraint cannot reach through a foreign key. Kept in sync by trigger
  -- below, with a nightly integrity check. Deliberate, documented denormalisation.
  status            appointment_status not null,

  -- DENORMALISED AT BOOKING. A quoted price is a promise (E7). Editing the
  -- service tomorrow must never change what this customer was told today.
  service_name      text not null,
  price             numeric(12,2) not null,
  currency          currency_code not null default 'PKR',
  duration_minutes  int not null,

  staff_commission_amount numeric(12,2) not null default 0,   -- computed at completion
  sequence          int not null default 1,
  created_at        timestamptz not null default now(),

  -- ===== INVARIANT I1: no staff double-booking =====
  constraint no_staff_double_booking exclude using gist (
    staff_id       with =,
    occupies_range with &&
  ) where (
    staff_id is not null and
    status in ('pending_payment','confirmed','rescheduled','checked_in','late','in_progress')
  ),

  -- ===== INVARIANT I2: no resource double-booking =====
  constraint no_resource_double_booking exclude using gist (
    resource_id    with =,
    occupies_range with &&
  ) where (
    resource_id is not null and
    status in ('pending_payment','confirmed','rescheduled','checked_in','late','in_progress')
  )
);
create index idx_items_staff  on appointment_items using gist(staff_id, occupies_range);
create index idx_items_branch on appointment_items using gist(branch_id, occupies_range);
create index idx_items_appt   on appointment_items(appointment_id);

-- Keep the mirrored status honest.
create or replace function sync_item_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    update appointment_items set status = new.status where appointment_id = new.id;
  end if;
  return new;
end $$;

create trigger t_sync_item_status after update of status on appointments
  for each row execute function sync_item_status();

-- Immutable event log. The audit spine.
create table appointment_events (
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
create index idx_appt_events on appointment_events(appointment_id, created_at);

-- ============================================================================
-- PAYMENTS
--
-- Muddarris lesson, encoded: a refund row cannot claim success without a
-- provider reference. The check constraint below makes
-- `status: 'succeeded'` with no provider_refund_id IMPOSSIBLE.
-- Phantom refunds cannot be written, not even by a bug.
-- ============================================================================
create table payments (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references appointments(id),
  payer_user_id   uuid references auth.users(id),
  purpose         text not null check (purpose in ('booking_fee','service_payment','subscription')),
  amount          numeric(12,2) not null check (amount > 0),
  currency        currency_code not null default 'PKR',
  method          text check (method in ('safepay','jazzcash','easypaisa','card','bank_transfer','cash')),
  provider        text,
  provider_txn_id text,
  status          payment_status not null default 'initiated',
  idempotency_key text not null unique,     -- duplicate webhooks are a certainty
  failure_reason  text,
  raw_response    jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_payment_provider_txn on payments(provider, provider_txn_id)
  where provider_txn_id is not null;

create table refunds (
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

  -- A refund cannot be 'succeeded' without evidence that money actually moved.
  constraint refund_success_needs_provider_ref
    check (status <> 'succeeded' or provider_refund_id is not null)
);
