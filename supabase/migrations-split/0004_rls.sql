-- ============================================================================
-- 0004 — Row-Level Security
--
-- ADR-007: RLS is the BACKSTOP, not the authorization model.
-- All writes go through server routes with an explicit PermissionService.
-- RLS is the seatbelt that catches the bug you shipped anyway.
--
-- Every table is FORCE'd, including for the table owner.
-- ============================================================================

-- Which business does the current user work for?
create or replace function current_business_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select business_id from staff
   where user_id = auth.uid() and deleted_at is null and status = 'active';
$$;

-- Which staff row is the current user?
create or replace function current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from staff
   where user_id = auth.uid() and deleted_at is null and status = 'active'
   limit 1;
$$;

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
alter table staff_leaves       enable row level security;
alter table business_customers enable row level security;
alter table appointments       enable row level security;
alter table appointment_items  enable row level security;
alter table appointment_events enable row level security;
alter table payments           enable row level security;
alter table refunds            enable row level security;

alter table payments           force row level security;
alter table refunds            force row level security;
alter table business_customers force row level security;

-- ---------------------------------------------------------------------------
-- CUSTOMERS: you, and only you.
-- ---------------------------------------------------------------------------
create policy "customers read self"   on customers for select using (id = auth.uid());
create policy "customers update self" on customers for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- PUBLIC READS: only verified + listed businesses. Everything else is invisible.
-- ---------------------------------------------------------------------------
create policy "public reads listed businesses" on businesses for select
  to anon, authenticated
  using (is_listed and status = 'verified' and deleted_at is null);

create policy "public reads listed branches" on branches for select
  to anon, authenticated
  using (
    deleted_at is null and is_active
    and exists (select 1 from businesses b
                 where b.id = branches.business_id
                   and b.is_listed and b.status = 'verified')
  );

-- ---------------------------------------------------------------------------
-- TENANT ISOLATION: a business sees its own rows. Nothing else. Ever.
-- ---------------------------------------------------------------------------
create policy "staff read own business" on staff for select
  using (business_id in (select current_business_ids()));

create policy "biz reads own services" on services for select
  using (business_id in (select current_business_ids()));

create policy "biz reads own customers" on business_customers for select
  using (business_id in (select current_business_ids()));

-- ---------------------------------------------------------------------------
-- APPOINTMENTS
--   customer -> her own
--   business staff with appointments:read:all -> the whole branch
--   plain staff (ADR-005) -> ONLY the appointments they are performing
-- ---------------------------------------------------------------------------
create policy "customer reads own appointments" on appointments for select
  using (customer_id = auth.uid());

create policy "business reads own appointments" on appointments for select
  using (
    business_id in (select current_business_ids())
    and (
      -- full-access roles
      exists (
        select 1 from staff s join roles r on r.id = s.role_id
         where s.user_id = auth.uid()
           and 'appointments:read:all' = any(r.permissions)
      )
      or
      -- a stylist sees her own book and nobody else's
      exists (
        select 1 from appointment_items ai
         where ai.appointment_id = appointments.id
           and ai.staff_id = current_staff_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- MONEY + AUDIT: no anon, no authenticated. Service role only.
-- No SELECT policy = no SELECT. That is deliberate, and it is the point.
-- ---------------------------------------------------------------------------
-- payments   : (none)
-- refunds    : (none)
-- appointment_events : (none)

-- ============================================================================
-- The test that keeps this honest (blocking, on every PR):
--
--   Instantiate a raw supabase-js client with the ANON key and Customer A's
--   JWT. Attempt to read and write EVERY table belonging to Business B and
--   Customer C. Every single attempt must fail.
--
--   If that test ever goes green when it should be red, stop everything.
--   A cross-tenant leak here is one salon reading another salon's entire
--   customer list — thousands of women's names, phone numbers and the times
--   they'll be at a known address. That is not an embarrassment. That is the
--   end of the company.
-- ============================================================================
