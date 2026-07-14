-- ============================================================================
-- 0006 — Health check support
--
-- Exposes exactly enough of the Postgres catalog for /api/health to assert
-- that the double-booking constraints are actually installed.
--
-- WHY THIS EXISTS:
--   If migration 0003 is skipped, or somebody drops a constraint to unblock a
--   test and forgets to restore it, the application keeps working perfectly.
--   Every screen loads. Every booking succeeds. Nothing errors.
--
--   And then two customers book the same 6pm slot and both get a confirmation,
--   and the salon owner never trusts the calendar again.
--
--   This view turns a silent, unrecoverable failure into a loud 503.
-- ============================================================================

create or replace view health_constraints as
  select conname::text
    from pg_constraint
   where conname in ('no_staff_double_booking', 'no_resource_double_booking')
     and contype = 'x';   -- 'x' = EXCLUDE. Not just any constraint with that name.

revoke all on health_constraints from anon, authenticated;
