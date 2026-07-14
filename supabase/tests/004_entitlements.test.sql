-- ============================================================================
-- ENTITLEMENTS — blocking test.
--
-- Billing bugs are the quietest and most expensive kind. A Starter customer
-- silently getting Business features for four months is money you never see,
-- and you find out from an accountant, not an alert.
-- ============================================================================
begin;
select plan(6);

insert into auth.users (id, email)
values ('eeeeeeee-0000-0000-0000-00000000000e', 'owner@test.pk')
on conflict do nothing;

-- A new business is created...
insert into businesses (id, owner_user_id, legal_name, display_name, slug, primary_category_id, status)
values ('f0000000-0000-0000-0000-00000000000f',
        'eeeeeeee-0000-0000-0000-00000000000e',
        'Test Salon', 'Test Salon', 'test-salon-ent',
        (select id from service_categories where slug = 'hair_salon'),
        'verified');

-- --- 1. ...and lands on Trial automatically, for 30 days -------------------
select is(
  (select p.code from subscriptions s join plans p on p.id = s.plan_id
    where s.business_id = 'f0000000-0000-0000-0000-00000000000f'),
  'trial',
  'a new business starts on Trial automatically');

select ok(
  (select trial_ends_at::date from subscriptions
    where business_id = 'f0000000-0000-0000-0000-00000000000f')
  = (now() + interval '30 days')::date,
  'the trial is 30 days, not 90');

-- --- 2. Trial DOES include staff management -------------------------------
-- We moved this from Starter to Trial deliberately. A 6-stylist salon cannot
-- use a calendar without staff on it — gating this would have made the trial
-- useless to exactly the businesses we want.
select ok(
  has_feature('f0000000-0000-0000-0000-00000000000f', 'staff.basic'),
  'Trial includes basic staff management');

select is(
  feature_limit('f0000000-0000-0000-0000-00000000000f', 'staff.basic'),
  5,
  'Trial caps staff at 5');

-- --- 3. Trial does NOT include paid features ------------------------------
select ok(
  not has_feature('f0000000-0000-0000-0000-00000000000f', 'analytics.advanced'),
  'Trial does NOT include advanced analytics');

-- --- 4. Multi-branch is Enterprise only. The DATABASE enforces it. ---------
insert into branches (business_id, name, slug, phone, address_line, city, location)
values ('f0000000-0000-0000-0000-00000000000f', 'Main', 'main', '+923001234567',
        'Johar Town', 'Lahore', st_point(74.27, 31.47)::geography);

select throws_ok(
  $$ insert into branches (business_id, name, slug, phone, address_line, city, location)
     values ('f0000000-0000-0000-0000-00000000000f', 'Second', 'second', '+923001234568',
             'DHA', 'Lahore', st_point(74.40, 31.47)::geography) $$,
  null, null,
  'a second branch is REFUSED without the Enterprise plan');

select * from finish();
rollback;
