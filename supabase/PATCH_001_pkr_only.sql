-- ############################################################################
--
--   PATCH 001  —  PKR ONLY
--
--   Run this ONLY IF you have already run SCHEMA.sql.
--   If you are setting up a fresh database, SCHEMA.sql already has this. Skip.
--
--   Narrows currency_code from ('PKR','USD') to ('PKR').
--
--   WHY:
--     A currency you never use is a code path nobody ever tests. The day you
--     finally take a USD payment, you find out which of your fifty money
--     calculations quietly assumed PKR — in production, with real money.
--
--     Better: one currency the database enforces absolutely. Widen it
--     deliberately, with tests, on the day you actually need it. That day is
--     4-5 years away. This is a one-line ALTER when it comes.
--
-- ############################################################################

-- Nothing should exist that isn't PKR. Prove it before we tighten the screw.
do $$
declare bad int;
begin
  select count(*) into bad from (
    select 1 from appointments      where currency <> 'PKR'
    union all select 1 from appointment_items where currency <> 'PKR'
    union all select 1 from branch_services   where currency <> 'PKR'
    union all select 1 from payments          where currency <> 'PKR'
    union all select 1 from refunds           where currency <> 'PKR'
    union all select 1 from invoices          where currency <> 'PKR'
    union all select 1 from plans             where currency <> 'PKR'
  ) x;

  if bad > 0 then
    raise exception
      'Found % non-PKR rows. Convert or delete them before narrowing the domain.', bad;
  end if;
end $$;

-- Swap the constraint. The domain is used by ~10 columns; Postgres revalidates
-- every one of them against the new rule. If any row failed, this would abort —
-- which is exactly what you want a database to do with money.
alter domain currency_code drop constraint if exists currency_code_check;

alter domain currency_code
  add constraint currency_code_check check (value = 'PKR');

comment on domain currency_code is
  'PKR only. Widening this is a deliberate decision that requires auditing every money calculation in the product, not a convenience.';


-- ============================================================================
-- VERIFY — all three must behave as described.
-- ============================================================================

-- 1. MUST SUCCEED
select 'PKR'::currency_code;

-- 2. MUST ERROR  (this is your Muddarris bug, dead)
--    Uncomment to confirm:
-- select 'pkr'::currency_code;

-- 3. MUST ERROR  (USD is gone)
--    Uncomment to confirm:
-- select 'USD'::currency_code;
