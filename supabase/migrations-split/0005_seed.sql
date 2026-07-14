-- ============================================================================
-- 0005 — Seed: MVP categories + default role templates
-- ============================================================================

insert into service_categories (slug, name_en, name_ur, booking_type, requires_resource, display_order) values
  ('hair_salon',     'Hair Salons',        'ہیئر سیلون',   'slot',  false, 1),
  ('beauty_parlor',  'Beauty Parlors',     'بیوٹی پارلر',  'slot',  false, 2),
  ('nail_studio',    'Nail Studios',       'نیل اسٹوڈیو',  'slot',  false, 3),
  ('wellness',       'Wellness Centers',   'ویلنس سینٹر',  'slot',  true,  4);

-- Reserved, INACTIVE. Present so the schema stays honest about what's coming,
-- absent from the product so we don't ship a bad experience for either. ADR-003.
insert into service_categories (slug, name_en, booking_type, is_active, display_order) values
  ('mehndi_studio',  'Mehndi Studios',    'event', false, 5),   -- date-based, deposits, at-home
  ('clinic',         'Clinics & Dentists','queue', false, 6);   -- health records, PMDC exposure

-- Default role templates (business_id null = platform template, cloned on signup)
insert into roles (business_id, code, name, is_system, permissions) values
  (null, 'owner', 'Owner', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'services:write','pricing:write',
    'staff:read','staff:write','staff:commission:read:all','leaves:approve',
    'customers:read','customers:notes:write',
    'analytics:read','revenue:read','marketing:write',
    'settings:write','subscription:manage','roles:write','audit:read'
  ]),
  (null, 'manager', 'Manager', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'services:write',
    'staff:read','staff:write','staff:commission:read:all','leaves:approve',
    'customers:read','customers:notes:write',
    'analytics:read','revenue:read','marketing:write'
  ]),
  -- NOTE: pricing:write is deliberately withheld from Manager. In a commission
  -- salon, whoever can change prices can change staff earnings. That is a fraud
  -- vector and a source of internal disputes. Grant it explicitly, or not at all.
  (null, 'receptionist', 'Receptionist', true, array[
    'appointments:read:all','appointments:write','appointments:cancel','appointments:complete',
    'customers:read','customers:notes:write'
  ]),
  (null, 'staff', 'Staff', true, array[
    'appointments:read:own','appointments:complete',
    'staff:commission:read:own',
    'customers:read','customers:notes:write'
  ]);
