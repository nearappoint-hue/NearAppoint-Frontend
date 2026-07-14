-- ============================================================================
-- 0007 — Category & subcategory taxonomy
--
-- 6 categories, ~60 subcategories.
--
-- THE IMPORTANT PART OF THIS MIGRATION IS `booking_policy`.
--
-- Aesthetic Clinics offer procedures that range from "a facial" to "an
-- injectable that requires a prescription and a licensed doctor." Treating them
-- as one bookable list would let a customer book Botox from a salon on a
-- Tuesday, and the first complication is a lawsuit — against a clinic that YOU
-- listed and YOU verified.
--
-- So the policy lives in the DATABASE, on the row, not in a doc:
--
--   'bookable'           book it now, like a haircut
--   'consultation_only'  book a CONSULT. The procedure is arranged offline.
--   'disabled'           not offered at all. Seeded for the record; never shown.
--
-- Botox, dermal fillers and PRP are 'disabled'. They are prescription-only
-- injectables regulated by the PMC. We are not in that business.
-- ============================================================================

-- Drop the old seed so we can lay the real taxonomy down cleanly.
delete from service_categories where slug in
  ('hair_salon','beauty_parlor','nail_studio','wellness','mehndi_studio','clinic');

alter table service_categories
  add column if not exists icon         text,
  add column if not exists description  text,
  add column if not exists requires_medical_license boolean not null default false;

-- ---------------------------------------------------------------------------
-- SUBCATEGORIES
--
-- A subcategory is a TEMPLATE, not a service. When a salon onboards, we clone
-- the subcategories of their category into their own `services` table with
-- sensible default durations — and they edit from there.
--
-- This is what turns a 40-minute onboarding into a 5-minute one. Onboarding
-- friction is the single biggest churn risk we have.
-- ---------------------------------------------------------------------------
create table subcategories (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references service_categories(id) on delete cascade,
  slug              text not null,
  name_en           text not null,
  name_ur           text,

  -- Sensible defaults, so a salon can accept the whole menu in one tap and
  -- adjust later. These are typical Pakistani salon durations, not guesses.
  default_duration_minutes int not null check (default_duration_minutes between 5 and 480),
  default_buffer_minutes   int not null default 0,

  -- THE SAFETY GATE. See the header comment.
  booking_policy    text not null default 'bookable'
                      check (booking_policy in ('bookable','consultation_only','disabled')),
  policy_reason     text,          -- shown to the business, and to ops, verbatim

  gender_target     text not null default 'any' check (gender_target in ('any','female','male')),
  is_active         boolean not null default true,
  display_order     int not null default 0,
  created_at        timestamptz not null default now(),
  unique (category_id, slug)
);
create index idx_subcat_category on subcategories(category_id) where is_active;

-- A service inherits its policy from the subcategory it was cloned from.
alter table services
  add column if not exists subcategory_id uuid references subcategories(id),
  add column if not exists booking_policy text not null default 'bookable'
    check (booking_policy in ('bookable','consultation_only','disabled'));

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
insert into service_categories
  (slug, name_en, name_ur, icon, booking_type, requires_resource, requires_medical_license, display_order, description) values
  ('hair_salon',       'Hair Salons',       'ہیئر سیلون',       'scissors',    'slot',  false, false, 1, 'Cuts, colour, styling, beard & grooming'),
  ('beauty_parlor',    'Beauty Parlors',    'بیوٹی پارلر',      'sparkles',    'slot',  false, false, 2, 'Makeup, facials, threading, waxing & bridal'),
  ('nail_studio',      'Nail Studios',      'نیل اسٹوڈیو',      'hand',        'slot',  true,  false, 3, 'Manicure, pedicure, gel, acrylic & nail art'),
  -- Mehndi is EVENT booking, not slot booking. A bridal mehndi is a 4-hour
  -- commitment on a specific date, usually with a deposit. Forcing it into
  -- 15-minute slots would produce a bad product for mehndi artists AND
  -- pollute the schema for everyone else.
  ('mehndi_studio',    'Mehndi Studios',    'مہندی اسٹوڈیو',    'flower',      'event', false, false, 4, 'Bridal, party & occasion mehndi'),
  ('wellness',         'Wellness Centers',  'ویلنس سینٹر',      'leaf',        'slot',  true,  false, 5, 'Spa, massage, therapy & relaxation'),
  ('aesthetic_clinic', 'Aesthetic Clinics','ایستھیٹک کلینک',    'sparkle',     'slot',  true,  true,  6, 'Skin treatments & aesthetic consultations');

-- ============================================================================
-- SUBCATEGORIES
-- ============================================================================
with c as (select id, slug from service_categories)

-- ---- 1. HAIR SALONS -------------------------------------------------------
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.gen, v.ord from c, (values
  ('mens-haircut',      'Men''s Haircut',       'مردانہ ہیئر کٹ',    30, 5,  'male',   1),
  ('womens-haircut',    'Women''s Haircut',     'زنانہ ہیئر کٹ',     45, 10, 'female', 2),
  ('hair-styling',      'Hair Styling',         'ہیئر اسٹائلنگ',     45, 10, 'any',    3),
  ('hair-coloring',     'Hair Coloring',        'ہیئر کلرنگ',        120, 15, 'any',   4),
  ('hair-treatment',    'Hair Treatment',       'ہیئر ٹریٹمنٹ',      60, 10, 'any',    5),
  ('wash-blow-dry',     'Hair Wash & Blow Dry', 'واش اینڈ بلو ڈرائی', 40, 5,  'any',   6),
  ('beard-trim',        'Beard Trim',           'داڑھی ٹرم',         15, 5,  'male',   7),
  ('beard-styling',     'Beard Styling',        'بیئرڈ اسٹائلنگ',    25, 5,  'male',   8),
  ('shaving',           'Shaving',              'شیو',               20, 5,  'male',   9),
  ('head-massage',      'Head Massage',         'سر کا مساج',        20, 5,  'any',   10),
  ('groom-package',     'Groom Package',        'گروم پیکج',         150, 20, 'male', 11)
) as v(slug, en, ur, dur, buf, gen, ord)
where c.slug = 'hair_salon';

-- ---- 2. BEAUTY PARLORS ----------------------------------------------------
with c as (select id, slug from service_categories)
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, 'female', v.ord from c, (values
  ('bridal-makeup',     'Bridal Makeup',        'دلہن کا میک اپ',     180, 30, 1),
  ('party-makeup',      'Party Makeup',         'پارٹی میک اپ',       75, 15,  2),
  ('hair-styling',      'Hair Styling',         'ہیئر اسٹائلنگ',      45, 10,  3),
  ('facial',            'Facial Treatments',    'فیشل',               60, 15,  4),
  ('threading',         'Threading',            'تھریڈنگ',            15, 5,   5),
  ('waxing',            'Waxing',               'ویکسنگ',             45, 10,  6),
  ('bleach',            'Bleach',               'بلیچ',               30, 10,  7),
  ('skin-care',         'Skin Care',            'اسکن کیئر',          45, 10,  8),
  ('eyebrow-services',  'Eyebrow Services',     'آئی برو سروسز',      20, 5,   9),
  ('lash-brow',         'Lash & Brow Services', 'لیش اینڈ براؤ',      60, 10, 10),
  ('bridal-package',    'Bridal Package',       'برائیڈل پیکج',       300, 30, 11)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'beauty_parlor';

-- ---- 3. NAIL STUDIOS ------------------------------------------------------
with c as (select id, slug from service_categories)
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.ord from c, (values
  ('manicure',        'Manicure',        'مینیکیور',        40, 10, 1),
  ('pedicure',        'Pedicure',        'پیڈیکیور',        50, 10, 2),
  ('gel-nails',       'Gel Nails',       'جیل نیلز',        60, 10, 3),
  ('acrylic-nails',   'Acrylic Nails',   'ایکریلک نیلز',    90, 15, 4),
  ('nail-extensions', 'Nail Extensions', 'نیل ایکسٹینشن',   90, 15, 5),
  ('nail-art',        'Nail Art',        'نیل آرٹ',         45, 10, 6),
  ('nail-repair',     'Nail Repair',     'نیل ریپیئر',      20, 5,  7),
  ('nail-polish',     'Nail Polish',     'نیل پالش',        20, 5,  8),
  ('spa-manicure',    'Spa Manicure',    'اسپا مینیکیور',   60, 10, 9),
  ('spa-pedicure',    'Spa Pedicure',    'اسپا پیڈیکیور',   75, 10, 10)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'nail_studio';

-- ---- 4. MEHNDI STUDIOS ----------------------------------------------------
-- NOTE: 'Home Visit Mehndi' is DELIBERATELY ABSENT.
--
-- It sends a woman, alone, to a stranger's house. That requires ID-verified
-- artists, trip visibility, an SOS path and an incident-response function.
-- We have none of those, and one incident ends the brand.
-- Phase 3, with a proper trust & safety spec. Not before.
with c as (select id, slug from service_categories)
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, gender_target, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, 'female', v.ord from c, (values
  ('bridal-mehndi',      'Bridal Mehndi',        'دلہن کی مہندی',     240, 30, 1),
  ('party-mehndi',       'Party Mehndi',         'پارٹی مہندی',       60, 15,  2),
  ('engagement-mehndi',  'Engagement Mehndi',    'منگنی کی مہندی',    120, 20, 3),
  ('arabic-mehndi',      'Arabic Mehndi',        'عربی مہندی',        45, 10,  4),
  ('indian-mehndi',      'Indian Mehndi',        'انڈین مہندی',       90, 15,  5),
  ('pakistani-mehndi',   'Pakistani Mehndi',     'پاکستانی مہندی',    90, 15,  6),
  ('gulf-mehndi',        'Gulf Style Mehndi',    'گلف اسٹائل مہندی',  60, 15,  7),
  ('custom-mehndi',      'Custom Mehndi Design', 'کسٹم ڈیزائن',       120, 20, 8)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'mehndi_studio';

-- ---- 5. WELLNESS CENTERS --------------------------------------------------
with c as (select id, slug from service_categories)
insert into subcategories (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.ord from c, (values
  ('spa',               'Spa',                 'اسپا',              90, 20, 1),
  ('full-body-massage', 'Full Body Massage',   'فل باڈی مساج',      60, 15, 2),
  ('head-massage',      'Head Massage',        'سر کا مساج',        30, 10, 3),
  ('foot-massage',      'Foot Massage',        'پاؤں کا مساج',      40, 10, 4),
  ('aromatherapy',      'Aromatherapy',        'اروماتھراپی',       60, 15, 5),
  ('deep-tissue',       'Deep Tissue Massage', 'ڈیپ ٹشو مساج',      75, 15, 6),
  ('swedish-massage',   'Swedish Massage',     'سویڈش مساج',        60, 15, 7),
  ('hot-stone',         'Hot Stone Therapy',   'ہاٹ اسٹون تھراپی',  90, 20, 8),
  ('steam-room',        'Steam Room',          'اسٹیم روم',         30, 10, 9),
  ('sauna',             'Sauna',               'سونا',              30, 10, 10),
  ('relaxation',        'Relaxation Therapy',  'ریلیکسیشن تھراپی',  60, 15, 11)
) as v(slug, en, ur, dur, buf, ord)
where c.slug = 'wellness';

-- ============================================================================
-- 6. AESTHETIC CLINICS  —  READ THIS BEFORE CHANGING ANYTHING
--
-- Three tiers, enforced by the database:
--
--   bookable           Cosmetic. Non-invasive. Book it like a facial.
--   consultation_only  The customer books a CONSULT with a qualified person.
--                      The procedure itself is arranged offline, by them, with
--                      informed consent we are not equipped to capture.
--   disabled           We do not offer this. At all. Seeded so the row exists
--                      and nobody "helpfully" re-adds it in six months.
--
-- BOTOX, DERMAL FILLERS and PRP are prescription-only injectables. In Pakistan
-- they are regulated, and only a registered practitioner may administer them.
-- If a customer books "Botox" on NearAppoint from a salon and something goes
-- wrong, we listed that business and we verified it. That is our problem.
--
-- We are not in that business. `disabled` is not a soft-launch. It is a NO.
-- ============================================================================
with c as (select id, slug from service_categories)
insert into subcategories
  (category_id, slug, name_en, name_ur, default_duration_minutes, default_buffer_minutes,
   booking_policy, policy_reason, display_order)
select c.id, v.slug, v.en, v.ur, v.dur, v.buf, v.pol, v.reason, v.ord from c, (values
  -- ---- BOOKABLE: cosmetic, non-invasive ----
  ('hydrafacial',       'HydraFacial',           'ہائیڈرا فیشل',      60, 15,
     'bookable', null, 1),
  ('skin-consultation', 'Skin Consultation',     'اسکن کنسلٹیشن',     30, 10,
     'bookable', null, 2),
  ('acne-treatment',    'Acne Treatment',        'ایکنی ٹریٹمنٹ',     45, 15,
     'bookable', null, 3),
  ('chemical-peel',     'Chemical Peel',         'کیمیکل پیل',        45, 15,
     'bookable',
     'Superficial peels only. Medium and deep peels require a registered practitioner and are not bookable here.', 4),
  ('skin-rejuvenation', 'Skin Rejuvenation',     'اسکن ریجوینیشن',    60, 15,
     'bookable', null, 5),

  -- ---- CONSULTATION ONLY ----
  ('laser-hair-removal','Laser Hair Removal',    'لیزر ہیئر ریموول',  30, 15,
     'consultation_only',
     'Laser carries a real burn risk and requires a skin assessment first. Customers book a consultation; the treatment plan is agreed in person.', 6),
  ('anti-aging',        'Anti-Aging Treatments', 'اینٹی ایجنگ',       30, 15,
     'consultation_only',
     'Covers a wide range of procedures, some medical. Consultation first, always.', 7),

  -- ---- DISABLED: we do not offer these. ----
  ('botox',             'Botox',                 'بوٹوکس',            30, 15,
     'disabled',
     'Prescription-only injectable, regulated by the PMC. Only a registered practitioner may administer it. NearAppoint does not accept bookings for injectables.', 8),
  ('dermal-fillers',    'Dermal Fillers',        'ڈرمل فلرز',         45, 15,
     'disabled',
     'Prescription-only injectable, regulated by the PMC. NearAppoint does not accept bookings for injectables.', 9),
  ('prp-therapy',       'PRP Therapy',           'پی آر پی تھراپی',   60, 20,
     'disabled',
     'Involves drawing and re-injecting blood. A medical procedure requiring a licensed practitioner and clinical facilities. Not a booking we will take.', 10)
) as v(slug, en, ur, dur, buf, pol, reason, ord)
where c.slug = 'aesthetic_clinic';

-- Disabled subcategories are never shown to anyone. Belt and braces.
update subcategories set is_active = false where booking_policy = 'disabled';

-- ============================================================================
-- MEDICAL VERIFICATION
--
-- An aesthetic clinic cannot be verified with a CNIC and a shop photo. It needs
-- the PMC registration number of the practitioner responsible.
--
-- This is a DIFFERENT verification queue with a DIFFERENT checklist. Ops must
-- check the number against the PMC register before approving.
-- ============================================================================
alter table businesses
  add column if not exists pmc_registration_number text,
  add column if not exists medical_verified_at     timestamptz,
  add column if not exists medical_verified_by     uuid;

alter table business_documents
  drop constraint if exists business_documents_doc_type_check;

alter table business_documents
  add constraint business_documents_doc_type_check check (doc_type in (
    'cnic_front','cnic_back','business_registration','utility_bill',
    'shop_photo','ntn_certificate',
    -- Aesthetic clinics only:
    'pmc_certificate',        -- practitioner's PMC registration
    'practitioner_cnic',
    'clinic_license'
  ));

-- A business in a medical category CANNOT be listed without medical verification.
-- Not "should not". Cannot — the database refuses.
create or replace function assert_medical_verified()
returns trigger language plpgsql as $$
declare needs_license boolean;
begin
  if new.is_listed is not true then return new; end if;

  select sc.requires_medical_license into needs_license
    from service_categories sc
   where sc.id = new.primary_category_id;

  if needs_license and new.medical_verified_at is null then
    raise exception
      'Business % is in a medical category and cannot be listed without medical verification (PMC registration).',
      new.display_name
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger t_assert_medical_verified
  before insert or update of is_listed on businesses
  for each row execute function assert_medical_verified();

comment on trigger t_assert_medical_verified on businesses is
  'An aesthetic clinic cannot appear in customer search until a human has checked its PMC registration. Enforced here so no code path can skip it.';
