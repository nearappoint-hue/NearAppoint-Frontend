-- ============================================================================
-- THE TEST THAT BLOCKS EVERY MERGE.
--
-- If this ever goes red, stop and fix it before anything else. A double-booked
-- 6pm slot on a Saturday is the single failure that makes a salon owner stop
-- trusting the calendar — and once she stops trusting it, she goes back to the
-- paper register and never comes back.
-- ============================================================================
begin;
select plan(4);

-- --- fixtures -------------------------------------------------------------
insert into businesses (id, owner_user_id, legal_name, display_name, slug, status)
values ('11111111-1111-1111-1111-111111111111',
        (select id from auth.users limit 1),
        'Test Salon','Test Salon','test-salon','verified');

insert into branches (id, business_id, name, slug, phone, address_line, city, location)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Main','main','+923001234567','Johar Town','Lahore',
        st_point(74.27, 31.47)::geography);

insert into roles (id, business_id, code, name)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111','staff','Staff');

insert into staff (id, business_id, branch_id, role_id, full_name, phone)
values ('44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        'Hina','+923009999999');

insert into service_categories (id, slug, name_en)
values ('55555555-5555-5555-5555-555555555555','test-cat','Test');

insert into services (id, business_id, category_id, name, duration_minutes)
values ('66666666-6666-6666-6666-666666666666',
        '11111111-1111-1111-1111-111111111111',
        '55555555-5555-5555-5555-555555555555','Haircut',45);

insert into business_customers (id, business_id, phone)
values ('77777777-7777-7777-7777-777777777777',
        '11111111-1111-1111-1111-111111111111','+923001111111');

create or replace function _mk_appt(ref text, r tstzrange, st appointment_status)
returns void language plpgsql as $fn$
declare a uuid := gen_random_uuid();
begin
  insert into appointments (id, reference, business_id, branch_id, business_customer_id,
                            status, source, time_range, total_duration_minutes)
  values (a, ref, '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          '77777777-7777-7777-7777-777777777777',
          st, 'walk_in', r, 45);

  insert into appointment_items (appointment_id, branch_id, service_id, staff_id,
                                 occupies_range, service_range, status,
                                 service_name, price, duration_minutes)
  values (a, '22222222-2222-2222-2222-222222222222',
          '66666666-6666-6666-6666-666666666666',
          '44444444-4444-4444-4444-444444444444',
          r, r, st, 'Haircut', 1500, 45);
end $fn$;

-- --- 1. the first booking succeeds ----------------------------------------
select lives_ok(
  $$ select _mk_appt('NA-001',
       tstzrange('2026-08-01 18:00+05','2026-08-01 18:45+05'), 'confirmed') $$,
  'first booking at 6:00pm is accepted');

-- --- 2. an EXACT overlap is refused BY THE DATABASE ------------------------
select throws_ok(
  $$ select _mk_appt('NA-002',
       tstzrange('2026-08-01 18:00+05','2026-08-01 18:45+05'), 'confirmed') $$,
  '23P01',
  null,
  'identical slot for the same staff is REFUSED (exclusion_violation)');

-- --- 3. a PARTIAL overlap is refused too -----------------------------------
select throws_ok(
  $$ select _mk_appt('NA-003',
       tstzrange('2026-08-01 18:30+05','2026-08-01 19:15+05'), 'confirmed') $$,
  '23P01',
  null,
  'partial overlap for the same staff is REFUSED');

-- --- 4. a cancelled appointment RELEASES the slot --------------------------
-- Terminal states must not occupy the calendar, or a cancellation would
-- permanently poison a slot.
update appointments set status = 'cancelled_by_customer' where reference = 'NA-001';

select lives_ok(
  $$ select _mk_appt('NA-004',
       tstzrange('2026-08-01 18:00+05','2026-08-01 18:45+05'), 'confirmed') $$,
  'cancelling releases the slot for the next customer');

select * from finish();
rollback;
