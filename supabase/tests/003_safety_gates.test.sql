-- ============================================================================
-- SAFETY GATES — blocking test.
--
-- "We decided not to offer Botox" is a sentence in a document. It protects
-- nobody. THIS is what protects people.
--
-- If any of these go red, a customer can book a prescription-only injectable
-- from a salon, or an unverified clinic can appear in search. Both are lawsuits
-- with our name on them.
-- ============================================================================
begin;
select plan(7);

-- --- 1. Botox, fillers and PRP are DISABLED, not merely hidden -------------
select is(
  (select count(*)::int from subcategories
    where slug in ('botox','dermal-fillers','prp-therapy')
      and booking_policy = 'disabled'),
  3,
  'Botox, dermal fillers and PRP are disabled — prescription-only injectables');

-- --- 2. And they are inactive, so they cannot be rendered anywhere ---------
select is(
  (select count(*)::int from subcategories
    where slug in ('botox','dermal-fillers','prp-therapy') and is_active = true),
  0,
  'disabled subcategories are also inactive — belt and braces');

-- --- 3. Laser and anti-aging require a consultation first ------------------
select is(
  (select count(*)::int from subcategories
    where slug in ('laser-hair-removal','anti-aging')
      and booking_policy = 'consultation_only'),
  2,
  'Laser and anti-aging are consultation-only — a burn risk needs an assessment');

-- --- 4. Home Visit Mehndi does not exist -----------------------------------
-- It sends a woman, alone, to a stranger's house. Not until we have
-- ID-verified artists, trip visibility and an SOS path.
select is(
  (select count(*)::int from subcategories where slug like '%home%'),
  0,
  'Home Visit Mehndi is NOT in the taxonomy');

-- --- 5. Aesthetic Clinics are flagged as requiring a medical licence -------
select is(
  (select requires_medical_license from service_categories where slug = 'aesthetic_clinic'),
  true,
  'Aesthetic Clinics require a medical licence');

-- --- 6. AN UNVERIFIED CLINIC CANNOT BE LISTED. The DATABASE refuses. -------
insert into auth.users (id, email)
values ('cccccccc-0000-0000-0000-00000000000c', 'clinic@test.pk')
on conflict do nothing;

insert into businesses (id, owner_user_id, legal_name, display_name, slug,
                        primary_category_id, status, is_listed)
values ('d0000000-0000-0000-0000-00000000000d',
        'cccccccc-0000-0000-0000-00000000000c',
        'Test Clinic', 'Test Clinic', 'test-clinic',
        (select id from service_categories where slug = 'aesthetic_clinic'),
        'verified', false);

select throws_ok(
  $$ update businesses set is_listed = true
      where id = 'd0000000-0000-0000-0000-00000000000d' $$,
  null, null,
  'An aesthetic clinic CANNOT be listed without PMC verification');

-- --- 7. Once medically verified, it can be listed --------------------------
update businesses set medical_verified_at = now()
 where id = 'd0000000-0000-0000-0000-00000000000d';

select lives_ok(
  $$ update businesses set is_listed = true
      where id = 'd0000000-0000-0000-0000-00000000000d' $$,
  'Once PMC-verified, the clinic can be listed');

select * from finish();
rollback;
