-- ============================================================================
-- 0001 — Extensions, enums, shared helpers
-- ============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "btree_gist";   -- REQUIRED. See 0003. Non-negotiable.
create extension if not exists "postgis";      -- nearby search (KNN)
create extension if not exists "pg_trgm";      -- fuzzy text ("saloon" / "salon" / "salloon")

-- ---------------------------------------------------------------------------
-- Enums. Closed sets only. Anything likely to grow stays text + check.
-- ---------------------------------------------------------------------------
create type business_status as enum
  ('draft','pending_verification','verified','suspended','rejected','churned');

create type staff_status as enum ('invited','active','suspended','left');

create type appointment_status as enum (
  'pending_payment','confirmed','rescheduled','checked_in','late',
  'in_progress','completed','no_show',
  'cancelled_by_customer','cancelled_by_business','expired'
);

create type appointment_source as enum
  ('customer_app','walk_in','phone','business_manual','waitlist');

create type payment_status as enum
  ('initiated','authorized','captured','failed','refunded','partially_refunded','voided');

-- ---------------------------------------------------------------------------
-- CURRENCY: one canonical representation, forever.
--
-- Muddarris lesson: 'PKR' vs 'pkr' compared as raw strings across modules is
-- how money silently disappears. Here it is a domain with a check constraint,
-- so the database refuses lowercase at the door. There is no code path that
-- can introduce a casing bug.
-- ---------------------------------------------------------------------------
create domain currency_code as char(3)
  check (value = upper(value) and value in ('PKR','USD'));

-- ---------------------------------------------------------------------------
-- updated_at, maintained by trigger. Never by application code.
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
