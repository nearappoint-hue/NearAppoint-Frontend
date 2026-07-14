-- ============================================================================
-- CROSS-TENANT ISOLATION.
--
-- We hold the phone numbers of thousands of women, the neighbourhoods they
-- live in, and the exact times they will be at a known address.
--
-- A leak here is not an embarrassment. It is a safety incident, and it is the
-- end of the company. This test blocks every merge.
-- ============================================================================
begin;
select plan(3);

-- Salon A and Salon B. Different owners. They must be invisible to each other.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001','owner-a@test.pk'),
  ('bbbbbbbb-0000-0000-0000-000000000002','owner-b@test.pk')
on conflict do nothing;

insert into businesses (id, owner_user_id, legal_name, display_name, slug, status) values
  ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001',
   'Salon A','Salon A','salon-a','verified'),
  ('b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002',
   'Salon B','Salon B','salon-b','verified');

insert into business_customers (business_id, phone, full_name) values
  ('a0000000-0000-0000-0000-00000000000a','+923001111111','A Customer'),
  ('b0000000-0000-0000-0000-00000000000b','+923002222222','B Customer');

-- --- Act as Salon A's owner ------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}';

select is(
  (select count(*)::int from business_customers
    where business_id = 'b0000000-0000-0000-0000-00000000000b'),
  0,
  'Salon A CANNOT read Salon B customers');

select is(
  (select count(*)::int from payments), 0,
  'no authenticated user can read the payments table');

select is(
  (select count(*)::int from appointment_events), 0,
  'no authenticated user can read the audit log');

select * from finish();
rollback;
