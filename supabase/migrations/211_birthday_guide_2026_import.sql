-- 211_birthday_guide_2026_import.sql
--
-- 2026 Birthday Party Guide refresh.
-- Adds extra_categories[] on guide_listings so a single vendor row can
-- appear in multiple category buckets (e.g. Escapology under both
-- Entertainment AND Places to Party — Misc). Archives the 2025
-- birthday listings via is_published=false (soft delete — recoverable)
-- and imports 92 vendors from the 2026 CSV (97 CSV rows → 92 unique
-- businesses after collapsing 5 cross-listed dupes into
-- extra_categories).
--
-- Each vendor gets an advertiser_accounts row with kind='directory_only'
-- (default from migration 133) so the CRM 'Businesses' view stays
-- clean by default while detail pages, sidebar spotlights, and the
-- existing render pipeline all keep working.
--
-- Idempotent — re-running skips vendors whose slugs already exist and
-- upserts the guide_listings row per (advertiser, guide_type, year).

BEGIN;

-- 1. Schema: cross-listing support
ALTER TABLE guide_listings
  ADD COLUMN IF NOT EXISTS extra_categories TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_guide_listings_extra_categories
  ON guide_listings USING gin (extra_categories);

-- 2. Archive 2025 birthday listings (soft delete, recoverable)
UPDATE guide_listings
   SET is_published = false, updated_at = NOW()
 WHERE guide_type_slug IN ('birthday-party', 'birthday-party-guide')
   AND is_published = true
   AND listing_year IS DISTINCT FROM 2026;

-- 3. Insert 2026 vendors (advertiser_accounts + guide_listings)
DO $$
DECLARE
  v_acct_id UUID;
BEGIN

  -- 1. Bruster’s Ice Cream & Yogurt
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'brusters-ice-cream-and-yogurt';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Bruster’s Ice Cream & Yogurt', 'brusters-ice-cream-and-yogurt', '(334) 272.7369 or(334) 239-7004', NULL, 'https://brusters.com',
      '6835 Vaughn Road,  10684 Chantilly Pkwy', 'Montgomery, AL 36116 and 36117', 'Select from 8” round cake or 9×12 cake Choose ice cream and one of the cake flavors. Pick a rich middle layer of fudge or caramel. All…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Bruster’s Ice Cream & Yogurt', '6835 Vaughn Road,  10684 Chantilly Pkwy',
    'Montgomery, AL 36116 and 36117', '(334) 272.7369 or(334) 239-7004', 'https://brusters.com', NULL, 'Select from 8” round cake or 9×12 cake Choose ice cream and one of the cake flavors. Pick a rich middle layer of fudge or caramel. All…',
    '{"description":"Select from 8” round cake or 9×12 cake Choose ice cream and one of the cake flavors. Pick a rich middle layer of fudge or caramel. All cakes are “iced” with fresh vanilla ice cream.  We also have pies available.","city":"Montgomery","state":"AL","zip":"36116 and 36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 1, NOW(),
    0
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 2. Cakeology
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'cakeology';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Cakeology', 'cakeology', '(334) 647.1262', 'cakeologyweets@yahoo.com', NULL,
      '6250 Atlanta Hwy', 'Montgomery, AL 36117', 'We provide catering, cake shop, custom cakes, confectionary, bridal cakes, cupcakes, birthday cakes and Anniversary cakes.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Cakeology', '6250 Atlanta Hwy',
    'Montgomery, AL 36117', '(334) 647.1262', NULL, 'cakeologyweets@yahoo.com', 'We provide catering, cake shop, custom cakes, confectionary, bridal cakes, cupcakes, birthday cakes and Anniversary cakes.',
    '{"description":"We provide catering, cake shop, custom cakes, confectionary, bridal cakes, cupcakes, birthday cakes and Anniversary cakes.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 2, NOW(),
    10
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 3. Crumbl Cookie
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'crumbl-cookie';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Crumbl Cookie', 'crumbl-cookie', '(334) 523.0499 or (334) 230.7669', NULL, 'https://crumbl.com',
      '3012 Zelda Road              7736 Vaughn Road', 'Montgomery, AL 36106 and 36116', 'Bringing friends and family together over a box of the best cookies in the world! Our 170+ unique cookie flavors rotate weekly and are…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Crumbl Cookie', '3012 Zelda Road              7736 Vaughn Road',
    'Montgomery, AL 36106 and 36116', '(334) 523.0499 or (334) 230.7669', 'https://crumbl.com', NULL, 'Bringing friends and family together over a box of the best cookies in the world! Our 170+ unique cookie flavors rotate weekly and are…',
    '{"description":"Bringing friends and family together over a box of the best cookies in the world! Our 170+ unique cookie flavors rotate weekly and are served in our famous pink box.","city":"Montgomery","state":"AL","zip":"36106 and 36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 3, NOW(),
    20
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 4. Dairy Queen
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'dairy-queen';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Dairy Queen', 'dairy-queen', '(334) 244.9490 or (334) 272.1818', NULL, 'https://dairyqueen.com',
      '6120 Atlanta Hwy  and 3160 Taylor Road', 'Montgomery, AL 36117 and 36116', '8” round, 10” round, sheet cakes. Blizzard Cakes are 8 in”, 10 in” and a sheet cake. All can be personalized at no additional charge.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Dairy Queen', '6120 Atlanta Hwy  and 3160 Taylor Road',
    'Montgomery, AL 36117 and 36116', '(334) 244.9490 or (334) 272.1818', 'https://dairyqueen.com', NULL, '8” round, 10” round, sheet cakes. Blizzard Cakes are 8 in”, 10 in” and a sheet cake. All can be personalized at no additional charge.',
    '{"description":"8” round, 10” round, sheet cakes. Blizzard Cakes are 8 in”, 10 in” and a sheet cake. All can be personalized at no additional charge.","city":"Montgomery","state":"AL","zip":"36117 and 36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 4, NOW(),
    30
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 5. GiGi’s Cupcakes
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'gigis-cupcakes';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'GiGi’s Cupcakes', 'gigis-cupcakes', '(334) 356.3737', NULL, 'https://gigiscupcakesusa.com/montgomeryalabama',
      '8141 Vaughn Road', 'Montgomery, AL 36116', 'Nothing makes a special day unforgettable like a custom cupcake or cake creation from Gigi’s. Special selection offered every day of the…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'GiGi’s Cupcakes', '8141 Vaughn Road',
    'Montgomery, AL 36116', '(334) 356.3737', 'https://gigiscupcakesusa.com/montgomeryalabama', NULL, 'Nothing makes a special day unforgettable like a custom cupcake or cake creation from Gigi’s. Special selection offered every day of the…',
    '{"description":"Nothing makes a special day unforgettable like a custom cupcake or cake creation from Gigi’s. Special selection offered every day of the week. You may order online at our website and pick up at the store or view our daily menu online.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 5, NOW(),
    40
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 6. Great American Cookie Co. at Eastchase
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'great-american-cookie-co-at-eastchase';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Great American Cookie Co. at Eastchase', 'great-american-cookie-co-at-eastchase', '(334) 356.8111', NULL, 'https://greatamericancookies.com',
      '7048 Eastchase Pkwy', 'Montgomery, AL 36117', 'Choose from 16” round, 16” square and large Rectangular .', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Great American Cookie Co. at Eastchase', '7048 Eastchase Pkwy',
    'Montgomery, AL 36117', '(334) 356.8111', 'https://greatamericancookies.com', NULL, 'Choose from 16” round, 16” square and large Rectangular .',
    '{"description":"Choose from 16” round, 16” square and large Rectangular .","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 6, NOW(),
    50
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 7. JoZettie’s Cupcakes
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'jozetties-cupcakes';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'JoZettie’s Cupcakes', 'jozetties-cupcakes', '(334) 239.9289', 'jzcupcakes@yahoo.com', 'https://jozettiescupcakes.com',
      '1404 South Decatur Street and 2229 E. South Blvd.', 'Montgomery, AL 36104', 'JoZettie’s Cupcakes is please to offer a variety of cupcakes, cakes, cookies and pies for the holidays or your special occasion.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'JoZettie’s Cupcakes', '1404 South Decatur Street and 2229 E. South Blvd.',
    'Montgomery, AL 36104', '(334) 239.9289', 'https://jozettiescupcakes.com', 'jzcupcakes@yahoo.com', 'JoZettie’s Cupcakes is please to offer a variety of cupcakes, cakes, cookies and pies for the holidays or your special occasion.',
    '{"description":"JoZettie’s Cupcakes is please to offer a variety of cupcakes, cakes, cookies and pies for the holidays or your special occasion.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 7, NOW(),
    60
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 8. Lorraine''s Bake Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'lorraines-bake-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Lorraine''s Bake Shop', 'lorraines-bake-shop', '(334) 239.9132', NULL, 'https://lorrainesbakeshop.com',
      '22 Dexter Avenue', 'Montgomery, AL 36104', 'Freshly baked sweets and treats made from scratch on site. Please see our website for menu items.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Lorraine''s Bake Shop', '22 Dexter Avenue',
    'Montgomery, AL 36104', '(334) 239.9132', 'https://lorrainesbakeshop.com', NULL, 'Freshly baked sweets and treats made from scratch on site. Please see our website for menu items.',
    '{"description":"Freshly baked sweets and treats made from scratch on site. Please see our website for menu items.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 8, NOW(),
    70
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 9. LuLu''s Cake Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'lulus-cake-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'LuLu''s Cake Shop', 'lulus-cake-shop', '(334) 593.6690', NULL, NULL,
      '2463 Highland Avenue', 'Montgomery, AL 36107', 'Homemade cake slices, cupcakes, toffee bars and so much more in store daily.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'LuLu''s Cake Shop', '2463 Highland Avenue',
    'Montgomery, AL 36107', '(334) 593.6690', NULL, NULL, 'Homemade cake slices, cupcakes, toffee bars and so much more in store daily.',
    '{"description":"Homemade cake slices, cupcakes, toffee bars and so much more in store daily.","city":"Montgomery","state":"AL","zip":"36107"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 9, NOW(),
    80
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 10. Nothing But Bundt
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'nothing-but-bundt';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Nothing But Bundt', 'nothing-but-bundt', '(334) 9566503 or (334) 568.1253', NULL, 'https://nothingbundtcakes.com',
      '7030 Eastchase Pkwy     and 2582 Cobbs Ford Road', 'Montgomery and Prattville, AL 36117 and 36066', 'Select from 8", 10" and Tiered Bundt Cakes all crowned with our signature cream cheese frosting and perfect for all types of celebrations –…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Nothing But Bundt', '7030 Eastchase Pkwy     and 2582 Cobbs Ford Road',
    'Montgomery and Prattville, AL 36117 and 36066', '(334) 9566503 or (334) 568.1253', 'https://nothingbundtcakes.com', NULL, 'Select from 8", 10" and Tiered Bundt Cakes all crowned with our signature cream cheese frosting and perfect for all types of celebrations –…',
    '{"description":"Select from 8\", 10\" and Tiered Bundt Cakes all crowned with our signature cream cheese frosting and perfect for all types of celebrations – birthdays, holidays, weddings, get togethers, office parties or just because!","city":"Montgomery and Prattville","state":"AL","zip":"36117 and 36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 10, NOW(),
    90
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 11. Original Great American Cookie Co.
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'original-great-american-cookie-co';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Original Great American Cookie Co.', 'original-great-american-cookie-co', '(334) 271.1900', NULL, 'https://greatamericancookies.com',
      'Eastdale Mall', 'Montgomery, AL 36117', 'Up to 13 different varieties of cookies: 16” round 16” square and sheet cookie. Please call for prices.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Original Great American Cookie Co.', 'Eastdale Mall',
    'Montgomery, AL 36117', '(334) 271.1900', 'https://greatamericancookies.com', NULL, 'Up to 13 different varieties of cookies: 16” round 16” square and sheet cookie. Please call for prices.',
    '{"description":"Up to 13 different varieties of cookies:  16” round 16” square  and sheet cookie. Please call for prices.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 11, NOW(),
    100
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 12. Original Great American Cookie Co.
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'original-great-american-cookie-co-2';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Original Great American Cookie Co.', 'original-great-american-cookie-co-2', '(334) 226.4984', NULL, 'https://greatamericancookies.com',
      '2140 Cobbs Ford Road', 'Prattville, AL 36066', 'Up to 13 different varieties of cookies: 16” round 16” square and sheet cookie. Please call for prices.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Cakes/Finger Foods', '{}'::text[],
    TRUE, 'free', 2026, 'Original Great American Cookie Co.', '2140 Cobbs Ford Road',
    'Prattville, AL 36066', '(334) 226.4984', 'https://greatamericancookies.com', NULL, 'Up to 13 different varieties of cookies: 16” round 16” square and sheet cookie. Please call for prices.',
    '{"description":"Up to 13 different varieties of cookies:  16” round 16” square  and sheet cookie. Please call for prices.","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 12, NOW(),
    110
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 13. Big Green Bus
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'big-green-bus';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Big Green Bus', 'big-green-bus', 'Please call Amber Holley at (334) 324.4628 to schedule your party.', 'biggymbus@gmail.com', 'https://biggymbus.com',
      NULL, 'Montgomery, AL', 'The Big Green Bus brings the party to you! The Big Green Bus is a school bus that has been converted into a safe and fun preschool…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', ARRAY['Places to Party - Cheer/Gymnastics/Dance']::text[],
    TRUE, 'free', 2026, 'Big Green Bus', NULL,
    'Montgomery, AL', 'Please call Amber Holley at (334) 324.4628 to schedule your party.', 'https://biggymbus.com', 'biggymbus@gmail.com', 'The Big Green Bus brings the party to you! The Big Green Bus is a school bus that has been converted into a safe and fun preschool…',
    '{"description":"The Big Green Bus brings the party to you! The Big Green Bus is a school bus that has been converted into a safe and fun preschool gymnastics facility. Many elements of gymnastics are combined into one fun filled hour on board the Big Green Bus! The birthday child will receive a Big Green Bus shirt! Goody bags are included in the prices.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 13, NOW(),
    120
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 14. DJ at Large
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'dj-at-large';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'DJ at Large', 'dj-at-large', '(334) 260.9732', 'DJ@AtLarge.com', 'https://DJatLarge.com',
      '564 Oliver Road', 'Montgomery, AL 36117', 'Offers a variety of music plus karaoke and light shows for your child’s party. Video parties 12 ft. screens and popular videos. We can also…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'DJ at Large', '564 Oliver Road',
    'Montgomery, AL 36117', '(334) 260.9732', 'https://DJatLarge.com', 'DJ@AtLarge.com', 'Offers a variety of music plus karaoke and light shows for your child’s party. Video parties 12 ft. screens and popular videos. We can also…',
    '{"description":"Offers a variety of music plus karaoke and light shows for your child’s party. Video parties 12 ft. screens and popular videos. We can also provide the building for the party for an extra charge. Provides age appropriate music and will censor music to your discretion. Please call for pricing. “We put you first.”","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 14, NOW(),
    130
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 15. Dynamite Magic & Balloons
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'dynamite-magic-and-balloons';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Dynamite Magic & Balloons', 'dynamite-magic-and-balloons', '(334) 270.1234', NULL, 'https://dynamitemagicandballoons.com',
      NULL, 'Montgomery, AL', 'Helium tank rentals (varying prices and sizes). Yard Art and Balloon bouquet and decorations. Costumed characters available. Please visit…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'Dynamite Magic & Balloons', NULL,
    'Montgomery, AL', '(334) 270.1234', 'https://dynamitemagicandballoons.com', NULL, 'Helium tank rentals (varying prices and sizes). Yard Art and Balloon bouquet and decorations. Costumed characters available. Please visit…',
    '{"description":"Helium tank rentals (varying prices and sizes). Yard Art and Balloon bouquet and decorations. Costumed characters available. Please visit our website to see the characters we have to offer.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 15, NOW(),
    140
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 16. Escapology
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'escapology';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Escapology', 'escapology', '(334) 523.1947', NULL, 'https://escapology.com',
      '130 Commerce Street', 'Montgomery, AL', 'Our Birthday Party Package includes: 1 Hour Escape Game Adventure Enjoy 1 hour in our private event space 2 large pizzas (cheese or…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', ARRAY['Places to Party - Miscellaneous']::text[],
    TRUE, 'free', 2026, 'Escapology', '130 Commerce Street',
    'Montgomery, AL', '(334) 523.1947', 'https://escapology.com', NULL, 'Our Birthday Party Package includes: 1 Hour Escape Game Adventure Enjoy 1 hour in our private event space 2 large pizzas (cheese or…',
    '{"description":"Our Birthday Party Package includes:\n1 Hour Escape Game Adventure\nEnjoy 1 hour in our private event space\n2 large pizzas (cheese or pepperoni) and 2 2-liter sodas.\nWe provide all the necessary paper products, including plates, cups, and napkins.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 16, NOW(),
    150
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 17. Kreative Moments
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'kreative-moments';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Kreative Moments', 'kreative-moments', '(334) 233.4318', 'Kreativemomentsmgm@gmail.com', NULL,
      NULL, 'Montgomery, AL', 'Offering balloon twisting, face painting, and balloon art to make each event have that “wow” factor.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'Kreative Moments', NULL,
    'Montgomery, AL', '(334) 233.4318', NULL, 'Kreativemomentsmgm@gmail.com', 'Offering balloon twisting, face painting, and balloon art to make each event have that “wow” factor.',
    '{"description":"Offering balloon twisting, face painting, and balloon art to make each event have that “wow” factor.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 17, NOW(),
    160
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 18. Lil'' Priss Parties
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'lil-priss-parties';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Lil'' Priss Parties', 'lil-priss-parties', '(334) 226.6026', NULL, NULL,
      NULL, 'Eclectic, AL', 'We bring the party to you! Nerf Wars, Spa Parties, Princess Parties, Tea Parties, Tee Pee Sleep Over Parties and much, much more! Party…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'Lil'' Priss Parties', NULL,
    'Eclectic, AL', '(334) 226.6026', NULL, NULL, 'We bring the party to you! Nerf Wars, Spa Parties, Princess Parties, Tea Parties, Tee Pee Sleep Over Parties and much, much more! Party…',
    '{"description":"We bring the party to you!  Nerf Wars, Spa Parties, Princess Parties, Tea Parties, Tee Pee Sleep Over Parties and much, much more!  Party packages for boys and girls. Please call for more details and pricing.","city":"Eclectic","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 18, NOW(),
    170
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 19. Pretty and Pampered Bus
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'pretty-and-pampered-bus';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Pretty and Pampered Bus', 'pretty-and-pampered-bus', '(334) 402.3996', NULL, 'https://prettyandpamperedbus.com',
      NULL, 'Montgomery, AL', 'Pretty and Pampered Spa Bus for girls specially designed for young girls who love to get pampered and treated like a princess. Please visit…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'Pretty and Pampered Bus', NULL,
    'Montgomery, AL', '(334) 402.3996', 'https://prettyandpamperedbus.com', NULL, 'Pretty and Pampered Spa Bus for girls specially designed for young girls who love to get pampered and treated like a princess. Please visit…',
    '{"description":"Pretty and Pampered Spa Bus for girls specially designed for young girls who love to get pampered and treated like a princess. Please visit our website to see our birthday party themes and details.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 19, NOW(),
    180
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 20. Snapology
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'snapology';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Snapology', 'snapology', '(334) 325.4679', 'riverregionsnapology.com', 'https://snapology.com/riverregion',
      NULL, 'Montgomery, AL', 'Have the best party ever with our Lego and Robotics themed birthday party. We bring the party to you. Sit back and enjoy the party while…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Entertainment', '{}'::text[],
    TRUE, 'free', 2026, 'Snapology', NULL,
    'Montgomery, AL', '(334) 325.4679', 'https://snapology.com/riverregion', 'riverregionsnapology.com', 'Have the best party ever with our Lego and Robotics themed birthday party. We bring the party to you. Sit back and enjoy the party while…',
    '{"description":"Have the best party ever with our Lego and Robotics themed birthday party. We bring the party to you. Sit back and enjoy the party while our facilitator sets up  and  conducts the activities. Please visit our website for more details.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 20, NOW(),
    190
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 21. All about the Bounce
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'all-about-the-bounce';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'All about the Bounce', 'all-about-the-bounce', '(334) 220.1555', NULL, 'https://getthebounce.com',
      '67 Penser Blvd', 'Millbrook, AL 36054', 'We bring the bounce! Wide selection of inflatables for events, parties and more.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', '{}'::text[],
    TRUE, 'free', 2026, 'All about the Bounce', '67 Penser Blvd',
    'Millbrook, AL 36054', '(334) 220.1555', 'https://getthebounce.com', NULL, 'We bring the bounce! Wide selection of inflatables for events, parties and more.',
    '{"description":"We bring the bounce! Wide selection of inflatables for events, parties and more.","city":"Millbrook","state":"AL","zip":"36054"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 21, NOW(),
    200
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 22. Arrow Rents
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'arrow-rents';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Arrow Rents', 'arrow-rents', '(334) 277.0460', NULL, 'https://arrowrents.net',
      '5600 Calmar Dr.', 'Montgomery, AL 36116', 'Tents, tables, chairs, carnival equipment, fans, and bounce rides. All sorts of themed decor, balloons, helium tanks, and more. Provide…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', ARRAY['Paper Goods/Decoration/Invitations']::text[],
    TRUE, 'free', 2026, 'Arrow Rents', '5600 Calmar Dr.',
    'Montgomery, AL 36116', '(334) 277.0460', 'https://arrowrents.net', NULL, 'Tents, tables, chairs, carnival equipment, fans, and bounce rides. All sorts of themed decor, balloons, helium tanks, and more. Provide…',
    '{"description":"Tents, tables, chairs, carnival equipment, fans, and bounce rides. All sorts of themed decor, balloons, helium tanks, and more. Provide great selection and even better prices. “Your one stop party shop.”","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 22, NOW(),
    210
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 23. Brendle Rentals
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'brendle-rentals';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Brendle Rentals', 'brendle-rentals', '(334) 279.7368', 'natalie@brendlerentals.com', 'https://brendlerentals.com',
      '485 N. East Blvd.', 'Montgomery, AL 36117', 'Party supplies. Inflatables. Obstacle courses and other rides, carnival games, slide, bungee run, tents and train. We setup at City parks…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', ARRAY['Paper Goods/Decoration/Invitations']::text[],
    TRUE, 'free', 2026, 'Brendle Rentals', '485 N. East Blvd.',
    'Montgomery, AL 36117', '(334) 279.7368', 'https://brendlerentals.com', 'natalie@brendlerentals.com', 'Party supplies. Inflatables. Obstacle courses and other rides, carnival games, slide, bungee run, tents and train. We setup at City parks…',
    '{"description":"Party supplies. Inflatables. Obstacle courses and other rides, carnival games, slide, bungee run, tents and train. We setup at City parks and provide insurance.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 23, NOW(),
    220
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 24. The Evans Space Walker
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'the-evans-space-walker';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'The Evans Space Walker', 'the-evans-space-walker', '(334) 612.7025', NULL, 'https://thespacewalker.com',
      '2952 Birmingham Hwy.', 'Montgomery, AL 36108', 'Inflatable cinemas rental. We have a variety of moon walks, slides, games, slide combos, obstacle courses, characters and more… We also…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', '{}'::text[],
    TRUE, 'free', 2026, 'The Evans Space Walker', '2952 Birmingham Hwy.',
    'Montgomery, AL 36108', '(334) 612.7025', 'https://thespacewalker.com', NULL, 'Inflatable cinemas rental. We have a variety of moon walks, slides, games, slide combos, obstacle courses, characters and more… We also…',
    '{"description":"Inflatable cinemas rental. We have a variety of moon walks, slides, games, slide combos, obstacle courses, characters and more… We also rent tables, tents, generators, chairs, balloons and concession machines. Indoor facility available.","city":"Montgomery","state":"AL","zip":"36108"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 24, NOW(),
    230
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 25. Inflatables of Montgomery
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'inflatables-of-montgomery';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Inflatables of Montgomery', 'inflatables-of-montgomery', '(334) 398.0909', 'inflatablesofmontgomery@gmail.com', 'https://inflatablesofmontgomery.com',
      '30 Handey Warehouse Rd.', 'Montgomery, AL 36117', 'Moonwalks, Giant slides, Interactive inflatable, Obstacle Courses, Rides, Rock-Climbing wall, and much, much more. Rentals for special…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', '{}'::text[],
    TRUE, 'free', 2026, 'Inflatables of Montgomery', '30 Handey Warehouse Rd.',
    'Montgomery, AL 36117', '(334) 398.0909', 'https://inflatablesofmontgomery.com', 'inflatablesofmontgomery@gmail.com', 'Moonwalks, Giant slides, Interactive inflatable, Obstacle Courses, Rides, Rock-Climbing wall, and much, much more. Rentals for special…',
    '{"description":"Moonwalks, Giant slides, Interactive inflatable, Obstacle Courses, Rides, Rock-Climbing wall, and much, much more. Rentals for special events.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 25, NOW(),
    240
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 26. Space Walk of Montgomery
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'space-walk-of-montgomery';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Space Walk of Montgomery', 'space-walk-of-montgomery', '(334) 273.0204', 'spacewalkmtg@herecomesfun.com', 'https://herecomesfun.com/mtg',
      NULL, 'River Region, AL', 'What do you want to celebrate today? Setups for Birthday Parties, Daycare Events, Community/civic Events, School Carnivals and Sporting…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Equipment/Games Rentals', '{}'::text[],
    TRUE, 'free', 2026, 'Space Walk of Montgomery', NULL,
    'River Region, AL', '(334) 273.0204', 'https://herecomesfun.com/mtg', 'spacewalkmtg@herecomesfun.com', 'What do you want to celebrate today? Setups for Birthday Parties, Daycare Events, Community/civic Events, School Carnivals and Sporting…',
    '{"description":"What do you want to celebrate today? Setups for Birthday Parties, Daycare Events, Community/civic Events, School Carnivals and Sporting Events. We offer inflatable Space Walks, Water Slides, Obstacle Courses, Combos, Concessions and much more.","city":"River Region","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 26, NOW(),
    250
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 27. Capital City Copy Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'capital-city-copy-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Capital City Copy Shop', 'capital-city-copy-shop', '(334) 230.9681', NULL, 'https://capitalcitycopyshop.com',
      '2701 Poplar St', 'Montgomery, AL 36107', 'Poplar St. Invitations printed. Printing, copying, pick up, delivery, fax services available.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Paper Goods/Decoration/Invitations', ARRAY['Printed Invitations']::text[],
    TRUE, 'free', 2026, 'Capital City Copy Shop', '2701 Poplar St',
    'Montgomery, AL 36107', '(334) 230.9681', 'https://capitalcitycopyshop.com', NULL, 'Poplar St. Invitations printed. Printing, copying, pick up, delivery, fax services available.',
    '{"description":"Poplar St. Invitations printed. Printing, copying, pick up, delivery, fax services available.","city":"Montgomery","state":"AL","zip":"36107"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 27, NOW(),
    260
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 28. Hobby Lobby
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'hobby-lobby';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Hobby Lobby', 'hobby-lobby', '(334) 676.5444', NULL, 'https://hobbylobby.com',
      '8345 Eastchase Pkwy', 'Montgomery, AL 36117', 'Wide range of party supplies, decorations and more.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Paper Goods/Decoration/Invitations', '{}'::text[],
    TRUE, 'free', 2026, 'Hobby Lobby', '8345 Eastchase Pkwy',
    'Montgomery, AL 36117', '(334) 676.5444', 'https://hobbylobby.com', NULL, 'Wide range of party supplies, decorations and more.',
    '{"description":"Wide range of party supplies, decorations and more.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 28, NOW(),
    270
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 29. Home Goods
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'home-goods';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Home Goods', 'home-goods', '(3340 396.3877', NULL, 'https://marshalls.com',
      '7680 Eastchase Pkwy.', 'Montgomery, AL 36117', 'Table top decorations, floral, paper supplies and more.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Paper Goods/Decoration/Invitations', '{}'::text[],
    TRUE, 'free', 2026, 'Home Goods', '7680 Eastchase Pkwy.',
    'Montgomery, AL 36117', '(3340 396.3877', 'https://marshalls.com', NULL, 'Table top decorations, floral, paper supplies and more.',
    '{"description":"Table top decorations, floral, paper supplies and more.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 29, NOW(),
    280
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 30. Party on Purpose (POP)
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'party-on-purpose-pop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Party on Purpose (POP)', 'party-on-purpose-pop', '(334) 600.2552', NULL, 'https://mypopevent.com',
      NULL, 'Montgomery, AL', 'Party on Purpose is a locally owned, customizable event planning service focused on making your party truly unique! Choose from slumber…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Party Planners', '{}'::text[],
    TRUE, 'free', 2026, 'Party on Purpose (POP)', NULL,
    'Montgomery, AL', '(334) 600.2552', 'https://mypopevent.com', NULL, 'Party on Purpose is a locally owned, customizable event planning service focused on making your party truly unique! Choose from slumber…',
    '{"description":"Party on Purpose is a locally owned, customizable event planning service focused on making your party truly unique!  Choose from slumber parties complete with tents and lanterns, paint parties, POP Star Glam parties, tea parties and more.   Multiple packages available and we bring everything to you!","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 30, NOW(),
    290
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 31. Abrakadoodle Art & Events
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'abrakadoodle-art-and-events';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Abrakadoodle Art & Events', 'abrakadoodle-art-and-events', '(334) 265.5758', 'Mcornwell@abrakadoodle.com', 'https://abrakadoodle.com/AL01',
      NULL, 'Montgomery, AL', 'Instagram @Abrakadoodle_AL Creative art fun for your child for his/her birthday party. Everything Party is an Original. Painting parties…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Artistic', '{}'::text[],
    TRUE, 'free', 2026, 'Abrakadoodle Art & Events', NULL,
    'Montgomery, AL', '(334) 265.5758', 'https://abrakadoodle.com/AL01', 'Mcornwell@abrakadoodle.com', 'Instagram @Abrakadoodle_AL Creative art fun for your child for his/her birthday party. Everything Party is an Original. Painting parties…',
    '{"description":"Instagram @Abrakadoodle_AL\nCreative art fun for your child for his/her birthday party. Everything Party is an Original. Painting parties and professional face painting available. Please visit our website for more information.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 31, NOW(),
    300
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 32. Ahmazing Studio 249
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'ahmazing-studio-249';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Ahmazing Studio 249', 'ahmazing-studio-249', '-334', NULL, 'https://ahmazingpaintparties.com',
      '3643 Debby Drive', 'Montgomery, AL 36111', 'Kidz parties available. Please visit our website for more information on party packages.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Artistic', '{}'::text[],
    TRUE, 'free', 2026, 'Ahmazing Studio 249', '3643 Debby Drive',
    'Montgomery, AL 36111', '-334', 'https://ahmazingpaintparties.com', NULL, 'Kidz parties available. Please visit our website for more information on party packages.',
    '{"description":"Kidz parties available. Please visit our website for more information on party packages.","city":"Montgomery","state":"AL","zip":"36111"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 32, NOW(),
    310
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 33. P’ZAZZ ART STUDIO
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'pzazz-art-studio';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'P’ZAZZ ART STUDIO', 'pzazz-art-studio', '(334) 354.1975', NULL, 'https://pzazzart.com',
      '1812 Glynnwood Drive', 'Prattville, AL 36067', 'If you are looking for a unique place for a birthday party…then P’zazz is your place. Please call for pricing and party packages offered.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Artistic', '{}'::text[],
    TRUE, 'free', 2026, 'P’ZAZZ ART STUDIO', '1812 Glynnwood Drive',
    'Prattville, AL 36067', '(334) 354.1975', 'https://pzazzart.com', NULL, 'If you are looking for a unique place for a birthday party…then P’zazz is your place. Please call for pricing and party packages offered.',
    '{"description":"If you are looking for a unique place for a birthday party…then P’zazz is your place.  Please call for pricing and party packages offered.","city":"Prattville","state":"AL","zip":"36067"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 33, NOW(),
    320
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 34. BAMA Lanes Inc
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'bama-lanes-inc';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'BAMA Lanes Inc', 'bama-lanes-inc', '(334) 272.5423', NULL, 'https://bamalanes.com',
      '3020 Atlanta Hwy.', 'Montgomery, AL 36109', 'Three packages to choose from. All pkgs. include 2 hour party, Full birthday party setup, shoe rental, bumpers, ice cream, soft drink, six…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Bowling', '{}'::text[],
    TRUE, 'free', 2026, 'BAMA Lanes Inc', '3020 Atlanta Hwy.',
    'Montgomery, AL 36109', '(334) 272.5423', 'https://bamalanes.com', NULL, 'Three packages to choose from. All pkgs. include 2 hour party, Full birthday party setup, shoe rental, bumpers, ice cream, soft drink, six…',
    '{"description":"Three packages to choose from. All pkgs. include  2 hour party, Full birthday party setup, shoe rental, bumpers, ice cream, soft drink,  six children per lane. Please call for packages offered and pricing. Weekday, Weekend or Evening (subject to lane availability)","city":"Montgomery","state":"AL","zip":"36109"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 34, NOW(),
    330
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 35. BAMA Lanes, Prattville
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'bama-lanes-prattville';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'BAMA Lanes, Prattville', 'bama-lanes-prattville', '(334) 358.8600', NULL, 'https://bamalanesprattville.com',
      '1714 East Main St.', 'Prattville, AL 36066', 'Weekday Party Hours Monday-Thursday 10:30 – 3:30 and Friday 10:30 to 6 p.m. plus weekend parties. Various packages available.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Bowling', '{}'::text[],
    TRUE, 'free', 2026, 'BAMA Lanes, Prattville', '1714 East Main St.',
    'Prattville, AL 36066', '(334) 358.8600', 'https://bamalanesprattville.com', NULL, 'Weekday Party Hours Monday-Thursday 10:30 – 3:30 and Friday 10:30 to 6 p.m. plus weekend parties. Various packages available.',
    '{"description":"Weekday Party Hours Monday-Thursday 10:30 – 3:30 and Friday 10:30 to 6 p.m. plus weekend parties. Various packages available.","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 35, NOW(),
    340
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 36. Bowlero
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'bowlero';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Bowlero', 'bowlero', '(334) 819.7171', NULL, 'https://bowlero.com',
      '1661 Eastern Blvd.', 'Montgomery, AL 36117', 'Birthday party packages available. Please visit our website or call to build your birthday party package. Add-ons available and deposit…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Bowling', '{}'::text[],
    TRUE, 'free', 2026, 'Bowlero', '1661 Eastern Blvd.',
    'Montgomery, AL 36117', '(334) 819.7171', 'https://bowlero.com', NULL, 'Birthday party packages available. Please visit our website or call to build your birthday party package. Add-ons available and deposit…',
    '{"description":"Birthday party packages available. Please visit our website or call to build your birthday party package. Add-ons available and deposit required. Please call for more info.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 36, NOW(),
    350
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 37. Armory Athletics
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'armory-athletics';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Armory Athletics', 'armory-athletics', '(334) 625.2789', NULL, 'https://armoryathletics.com',
      '1018 Madison Avenue', 'Montgomery, AL 36104', 'Party Package available for up 10 children. One hour of gym time. We provide the fun! 2 - 6 foot tables will be provided for setup. Parents…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'Armory Athletics', '1018 Madison Avenue',
    'Montgomery, AL 36104', '(334) 625.2789', 'https://armoryathletics.com', NULL, 'Party Package available for up 10 children. One hour of gym time. We provide the fun! 2 - 6 foot tables will be provided for setup. Parents…',
    '{"description":"Party Package available for up 10 children. One hour of gym time. We provide the fun! 2 - 6 foot tables will be provided for setup. Parents provide food, paper goods and party favors. Please call for pricing. 10 Party invitations. 30 minutes allowed for cleanup after party.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 37, NOW(),
    360
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 38. Ballerina Birthday Parties at CJ’s Dance Factory in Prattville
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'ballerina-birthday-parties-at-cjs-dance-factory-in-prattvill';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Ballerina Birthday Parties at CJ’s Dance Factory in Prattville', 'ballerina-birthday-parties-at-cjs-dance-factory-in-prattvill', '(334) 467.8603', NULL, 'https://cjsdancefactory.com',
      '145 South Court Street', 'Prattville, AL 36067', 'CJ''s Dance Factory in Prattville hosts Birthday Parties for children ages 3 and up. The two hour princess fairytale begins when you and…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'Ballerina Birthday Parties at CJ’s Dance Factory in Prattville', '145 South Court Street',
    'Prattville, AL 36067', '(334) 467.8603', 'https://cjsdancefactory.com', NULL, 'CJ''s Dance Factory in Prattville hosts Birthday Parties for children ages 3 and up. The two hour princess fairytale begins when you and…',
    '{"description":"CJ''s Dance Factory in Prattville hosts Birthday Parties for children ages 3 and up. The two hour princess fairytale begins when you and your friends arrive. The Party set up includes the following: Table and chairs set up in the Polka Dot Party room, Dance studio area with music and mirrors, Our \"SugarPlum\" ballerina, up to 10 guests (more for an additional fee), Tutus for your guests ( to use for the party) and twirl in and a ballet class. $25 non-refundable deposit required.","city":"Prattville","state":"AL","zip":"36067"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 38, NOW(),
    370
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 39. Montgomery Ballet
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'montgomery-ballet';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Montgomery Ballet', 'montgomery-ballet', '(334) 721.3687', 'info@montgomeryballet.org', 'https://montgomeryballet.org',
      '440 Coliseum Blvd.', 'Montgomery, AL 36109', 'Parties hosted by Montgomery Ballet Professional Company Members. Have your very own Dance Class for you and your friends! Princess…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'Montgomery Ballet', '440 Coliseum Blvd.',
    'Montgomery, AL 36109', '(334) 721.3687', 'https://montgomeryballet.org', 'info@montgomeryballet.org', 'Parties hosted by Montgomery Ballet Professional Company Members. Have your very own Dance Class for you and your friends! Princess…',
    '{"description":"Parties hosted by Montgomery Ballet Professional Company Members. Have your very own Dance Class for you and your friends! Princess characters available! Call for details.","city":"Montgomery","state":"AL","zip":"36109"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 39, NOW(),
    380
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 40. Tonya Speed Dance
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'tonya-speed-dance';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Tonya Speed Dance', 'tonya-speed-dance', '(334) 277.1098', NULL, NULL,
      '3370 Harrison Road', 'Montgomery, AL 36109', 'We offer the best and most convenient venue for your child’s themed birthday party. We will help you customize the party and make it…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'Tonya Speed Dance', '3370 Harrison Road',
    'Montgomery, AL 36109', '(334) 277.1098', NULL, NULL, 'We offer the best and most convenient venue for your child’s themed birthday party. We will help you customize the party and make it…',
    '{"description":"We offer the best and most convenient venue for your child’s themed birthday party. We will help you customize the party and make it perfect and memorable.  Please call for themes and  pricing.","city":"Montgomery","state":"AL","zip":"36109"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 40, NOW(),
    390
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 41. TuTu School Montgomery
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'tutu-school-montgomery';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'TuTu School Montgomery', 'tutu-school-montgomery', '(334) 363.3360', 'twirl@tutuschoolmontgomery.com', 'https://tutuschoolmontgomery.com',
      '2960 G Zelda Road', 'Montgomery, AL 36106', 'Perfect way to celebrate you little Swan or Sugar Plum Fairy. Each party provides a brief ballet class, a special birthday story featuring…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'TuTu School Montgomery', '2960 G Zelda Road',
    'Montgomery, AL 36106', '(334) 363.3360', 'https://tutuschoolmontgomery.com', 'twirl@tutuschoolmontgomery.com', 'Perfect way to celebrate you little Swan or Sugar Plum Fairy. Each party provides a brief ballet class, a special birthday story featuring…',
    '{"description":"Perfect way to celebrate you little  Swan or Sugar Plum Fairy.  Each party provides a brief ballet class, a special birthday story featuring the guest of honor, a delicious cupcake picnic and delightful party favors.  Please visit our website for themes and rates.","city":"Montgomery","state":"AL","zip":"36106"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 41, NOW(),
    400
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 42. United Gymstars
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'united-gymstars';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'United Gymstars', 'united-gymstars', '(334) 284.2244', 'gym@unitedgymstarsandcheer.com', 'https://www.unitedgymstars.com',
      '6100 Brewbaker Blvd., off Troy Hwy.', 'Montgomery, AL 36116', 'Gymnastics, trampoline, recreational activities, supervised games, and birthday party room. We provide the facility and activities; you…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Cheer/Gymnastics/Dance', '{}'::text[],
    TRUE, 'free', 2026, 'United Gymstars', '6100 Brewbaker Blvd., off Troy Hwy.',
    'Montgomery, AL 36116', '(334) 284.2244', 'https://www.unitedgymstars.com', 'gym@unitedgymstarsandcheer.com', 'Gymnastics, trampoline, recreational activities, supervised games, and birthday party room. We provide the facility and activities; you…',
    '{"description":"Gymnastics, trampoline, recreational activities, supervised games, and birthday party room. We provide the facility and activities; you provide the cake, decorations and food. Please call for details and pricing.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 42, NOW(),
    410
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 43. Family Karate Center
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'family-karate-center';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Family Karate Center', 'family-karate-center', '(334) 277.4911', NULL, NULL,
      '8159 Vaughn Rd., Pepper Tree Shopping Center', 'Montgomery, AL 36117', 'Parties now available 7 days a week from 2 and up. Included in our parties are 2 hours of jam-packed fun. Please call for more information.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Martial Arts', '{}'::text[],
    TRUE, 'free', 2026, 'Family Karate Center', '8159 Vaughn Rd., Pepper Tree Shopping Center',
    'Montgomery, AL 36117', '(334) 277.4911', NULL, NULL, 'Parties now available 7 days a week from 2 and up. Included in our parties are 2 hours of jam-packed fun. Please call for more information.',
    '{"description":"Parties now available 7 days a week from 2 and up. Included in our parties are 2 hours of jam-packed fun. Please call for more information.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 43, NOW(),
    420
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 44. Johnson Karate & Fitness Academy
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'johnson-karate-and-fitness-academy';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Johnson Karate & Fitness Academy', 'johnson-karate-and-fitness-academy', '(334) 284.2344', NULL, 'https://johnsonsmartialartsacademy.com',
      '1751 Eastern Blvd.', 'Montgomery, AL 36117', '1.5 hours of pure fun. You provide the food and we provide the fun. Please call for rates. One free lesson offered to each birthday guest.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Martial Arts', '{}'::text[],
    TRUE, 'free', 2026, 'Johnson Karate & Fitness Academy', '1751 Eastern Blvd.',
    'Montgomery, AL 36117', '(334) 284.2344', 'https://johnsonsmartialartsacademy.com', NULL, '1.5 hours of pure fun. You provide the food and we provide the fun. Please call for rates. One free lesson offered to each birthday guest.',
    '{"description":"1.5 hours of pure fun. You provide the food and we provide the fun. Please call for rates. One free lesson offered to each birthday guest.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 44, NOW(),
    430
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 45. NextGen Martial Arts, Prattville
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'nextgen-martial-arts-prattville';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'NextGen Martial Arts, Prattville', 'nextgen-martial-arts-prattville', '(334) 590.3759', NULL, 'https://nextgenmartialarts.com',
      '698 Old Farm Lane S', 'Prattville, AL 36066', 'Parties are 1.5 hours. Options include: Nerf Wars, Dodge Ball and more. Karate fun and games. Parents provide paper products and cake and…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Martial Arts', '{}'::text[],
    TRUE, 'free', 2026, 'NextGen Martial Arts, Prattville', '698 Old Farm Lane S',
    'Prattville, AL 36066', '(334) 590.3759', 'https://nextgenmartialarts.com', NULL, 'Parties are 1.5 hours. Options include: Nerf Wars, Dodge Ball and more. Karate fun and games. Parents provide paper products and cake and…',
    '{"description":"Parties are 1.5 hours. Options include: Nerf Wars, Dodge Ball and more.  Karate fun and games. Parents provide paper products and cake and food. Call for pricing.","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 45, NOW(),
    440
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 46. Tiger Park Taekwondo
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'tiger-park-taekwondo';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Tiger Park Taekwondo', 'tiger-park-taekwondo', '(334) 277.2627', NULL, 'https://tigerparktaekwondo.com',
      '3125 Bell Road', 'Montgomery, AL 36116', 'Come party with us! We provide the facility, demonstration, mini-taekwondo class and Birthday child gets to break a board. You provide food…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Martial Arts', '{}'::text[],
    TRUE, 'free', 2026, 'Tiger Park Taekwondo', '3125 Bell Road',
    'Montgomery, AL 36116', '(334) 277.2627', 'https://tigerparktaekwondo.com', NULL, 'Come party with us! We provide the facility, demonstration, mini-taekwondo class and Birthday child gets to break a board. You provide food…',
    '{"description":"Come party with us! We provide the facility, demonstration, mini-taekwondo class and Birthday child gets to break a board. You provide food and cleanup. Please call them for information.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 46, NOW(),
    450
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 47. Tiger Rock Taekwondo
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'tiger-rock-taekwondo';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Tiger Rock Taekwondo', 'tiger-rock-taekwondo', '(334) 290.1127', NULL, 'https://prattvilletigerrock.com',
      '2144 Cobbs Ford Road', 'Prattville, AL 36066', 'Academy facility for 1.5 hours. 45-minute Martial Arts lesson taught by one of our certified instructors. Parties scheduled on Saturdays.…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Martial Arts', '{}'::text[],
    TRUE, 'free', 2026, 'Tiger Rock Taekwondo', '2144 Cobbs Ford Road',
    'Prattville, AL 36066', '(334) 290.1127', 'https://prattvilletigerrock.com', NULL, 'Academy facility for 1.5 hours. 45-minute Martial Arts lesson taught by one of our certified instructors. Parties scheduled on Saturdays.…',
    '{"description":"Academy facility for 1.5 hours. 45-minute Martial Arts lesson taught by one of our certified instructors. Parties scheduled on Saturdays. Includes a martial arts class with basic skills and agility games. Parents supply party decoration, treats and eats. We supply the facility, entertainment and clean up. Let us help make your birthday party fun and easy","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 47, NOW(),
    460
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 48. Adventure Sports Aquatic Center
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'adventure-sports-aquatic-center';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Adventure Sports Aquatic Center', 'adventure-sports-aquatic-center', '(334) 269.3483', NULL, 'https://adventuresports2.com',
      '1546 East Ann Street', 'Montgomery, AL 36107', 'Indoor or outdoor pools, kiddie pool, grilling and picnic area. Call for details.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Adventure Sports Aquatic Center', '1546 East Ann Street',
    'Montgomery, AL 36107', '(334) 269.3483', 'https://adventuresports2.com', NULL, 'Indoor or outdoor pools, kiddie pool, grilling and picnic area. Call for details.',
    '{"description":"Indoor or outdoor pools, kiddie pool, grilling and picnic area. Call for details.","city":"Montgomery","state":"AL","zip":"36107"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 48, NOW(),
    470
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 49. Antique Train Rides
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'antique-train-rides';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Antique Train Rides', 'antique-train-rides', '(205) 668.3435', NULL, 'https://hodrrm.org',
      'Located in Calera, 60 miles north of Montgomery', 'Calera, AL 35040', 'Party takes place in the restored Amtrak car. Includes an hour train ride through the woods and by the interstate. Parents can set up party…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Antique Train Rides', 'Located in Calera, 60 miles north of Montgomery',
    'Calera, AL 35040', '(205) 668.3435', 'https://hodrrm.org', NULL, 'Party takes place in the restored Amtrak car. Includes an hour train ride through the woods and by the interstate. Parents can set up party…',
    '{"description":"Party takes place in the restored Amtrak car. Includes an hour train ride through the woods and by the interstate. Parents can set up party in our restored Amtrak car. Kids can also look through the old railroad yard. Hostesses are available but parents supply food and supplies. Theme parties available (Thomas the Train…etc.)","city":"Calera","state":"AL","zip":"35040"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 49, NOW(),
    480
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 50. Auburn University Kid’s Club
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'auburn-university-kids-club';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Auburn University Kid’s Club', 'auburn-university-kids-club', '(334) 844.9526', NULL, 'https://auburntigers.com/kidsclub',
      '392 South Donahue Drive', 'Auburn, AL 36849', 'Party with the Auburn tigers! Packages for Men’s Basketball, Women’s Basketball, Gymnastics, Baseball, Softball, Soccer, Swimming & Diving,…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Auburn University Kid’s Club', '392 South Donahue Drive',
    'Auburn, AL 36849', '(334) 844.9526', 'https://auburntigers.com/kidsclub', NULL, 'Party with the Auburn tigers! Packages for Men’s Basketball, Women’s Basketball, Gymnastics, Baseball, Softball, Soccer, Swimming & Diving,…',
    '{"description":"Party with the Auburn tigers! Packages for Men’s Basketball, Women’s Basketball, Gymnastics, Baseball, Softball, Soccer, Swimming & Diving, Volleyball and Equestrian.","city":"Auburn","state":"AL","zip":"36849"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 50, NOW(),
    490
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 51. Bell Road YMCA
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'bell-road-ymca';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Bell Road YMCA', 'bell-road-ymca', '(334) 271.4343', NULL, 'https://ymcamontgomery.org',
      '2435 Bell Rd.', 'Montgomery, AL 36117', 'Celebrate your party with us! Teen Center Gym Adventure Room Splash Pool Pre-School Parties Outdoor Pool Indoor Pool Goodtimes Water Park…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Bell Road YMCA', '2435 Bell Rd.',
    'Montgomery, AL 36117', '(334) 271.4343', 'https://ymcamontgomery.org', NULL, 'Celebrate your party with us! Teen Center Gym Adventure Room Splash Pool Pre-School Parties Outdoor Pool Indoor Pool Goodtimes Water Park…',
    '{"description":"Celebrate your party with us!\nTeen Center Gym\nAdventure Room\nSplash Pool Pre-School Parties\nOutdoor Pool\nIndoor Pool\nGoodtimes Water Park                  Please call for pricing for members and non-members.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 51, NOW(),
    500
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 52. Chuck E Cheese
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'chuck-e-cheese';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Chuck E Cheese', 'chuck-e-cheese', '(334) 281.9290', NULL, 'https://chuckecheese.com',
      '1116 Eastdale Mall', 'Montgomery, AL 36117', 'A package to fit everybody and budget. Please visit our website for party packages available and to book a party.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Chuck E Cheese', '1116 Eastdale Mall',
    'Montgomery, AL 36117', '(334) 281.9290', 'https://chuckecheese.com', NULL, 'A package to fit everybody and budget. Please visit our website for party packages available and to book a party.',
    '{"description":"A package to fit everybody and budget. Please visit our website for party packages available and to book a party.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 52, NOW(),
    510
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 53. East Branch YMCA
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'east-branch-ymca';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'East Branch YMCA', 'east-branch-ymca', '(334) 272.339', NULL, 'https://ymcamontgomery.org',
      '3407 Pelzer Ave.', 'Montgomery, AL 36109', 'Parties for members. Indoor and outdoor pools. Outdoor pool includes slide and splash pool. YMCA provides lifeguards for party.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'East Branch YMCA', '3407 Pelzer Ave.',
    'Montgomery, AL 36109', '(334) 272.339', 'https://ymcamontgomery.org', NULL, 'Parties for members. Indoor and outdoor pools. Outdoor pool includes slide and splash pool. YMCA provides lifeguards for party.',
    '{"description":"Parties for members. Indoor and outdoor pools. Outdoor pool includes slide and splash pool. YMCA provides lifeguards for party.","city":"Montgomery","state":"AL","zip":"36109"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 53, NOW(),
    520
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 54. FC Montgomery Soccer
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'fc-montgomery-soccer';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'FC Montgomery Soccer', 'fc-montgomery-soccer', '(334) 207.5442', 'brunomr@fcmontgomery.com', 'https://fcmontgomery.com',
      '5334 Atlanta Hwy', 'Montgomery, AL 36117', 'We offer a broad spectrum of party opportunities and are very flexible because we are here to serve you and make your event special. Our…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'FC Montgomery Soccer', '5334 Atlanta Hwy',
    'Montgomery, AL 36117', '(334) 207.5442', 'https://fcmontgomery.com', 'brunomr@fcmontgomery.com', 'We offer a broad spectrum of party opportunities and are very flexible because we are here to serve you and make your event special. Our…',
    '{"description":"We offer a broad spectrum of party opportunities and are very flexible because we are here to serve you and make your event special. Our parties can last 1 to  3 hours, and include fun sports games, races, and short sided games. You will have full use of our kitchen, fridges, and the dining area. If you want it to be super easy, put us in charge of setting up tables, ordering the cake, drinks, or lunch. Cost: $100 -$230 depending on hours. Add-ons are available for additional fees.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 54, NOW(),
    530
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 55. Fun City Adventure Park
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'fun-city-adventure-park';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Fun City Adventure Park', 'fun-city-adventure-park', '(334) 356.2024', NULL, 'https://funcitymontgomery.com',
      '7861 Eastchase Pkwy', 'Montgomery, Al 36117', 'Experience the endless joy at Fun City. Come explore our website and see the many party packages available.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Fun City Adventure Park', '7861 Eastchase Pkwy',
    'Montgomery, Al 36117', '(334) 356.2024', 'https://funcitymontgomery.com', NULL, 'Experience the endless joy at Fun City. Come explore our website and see the many party packages available.',
    '{"description":"Experience the endless joy at Fun City. Come explore our website and see the many party packages available.","city":"Montgomery","state":"Al","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 55, NOW(),
    540
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 56. Great Wolf Lodge
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'great-wolf-lodge';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Great Wolf Lodge', 'great-wolf-lodge', '(844) 473.9653', NULL, 'https://greatwolf.com/georgia',
      '150 Tom Hall Parkway', 'LaGrange, GA 30241', 'Offering indoor water park fun and dry-land adventures for the entire family. Our resort near Atlanta features kid-friendly activities,…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Great Wolf Lodge', '150 Tom Hall Parkway',
    'LaGrange, GA 30241', '(844) 473.9653', 'https://greatwolf.com/georgia', NULL, 'Offering indoor water park fun and dry-land adventures for the entire family. Our resort near Atlanta features kid-friendly activities,…',
    '{"description":"Offering indoor water park fun and dry-land adventures for the entire family. Our resort near Atlanta features kid-friendly activities, dining options, an adult-friendly wine down service, and more all under one roof. Your stay includes access to the 93,000-sq. ft. water park’s pools and slides, kept warm at 84-degrees year-round.","city":"LaGrange","state":"GA","zip":"30241"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 56, NOW(),
    550
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 57. J & W Adventure Park
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'j-and-w-adventure-park';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'J & W Adventure Park', 'j-and-w-adventure-park', '(334) 676.1379', NULL, 'https://jwadventurepark.com',
      '3987 Eastern Blvd.', 'Montgomery, AL 36116', 'Please visit our website or call for more information on party packages we offer.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'J & W Adventure Park', '3987 Eastern Blvd.',
    'Montgomery, AL 36116', '(334) 676.1379', 'https://jwadventurepark.com', NULL, 'Please visit our website or call for more information on party packages we offer.',
    '{"description":"Please visit our website or call for more information on party packages we offer.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 57, NOW(),
    560
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 58. Launch Trampoline Park
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'launch-trampoline-park';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Launch Trampoline Park', 'launch-trampoline-park', '(334) 568.2041', NULL, 'https://launchtrampolinepark.com',
      '891 Boardroom Drive', 'Prattville, AL 36066', 'Three fun packed packages to choose from. 2 hour and 30 min. All packages include 60 min. of launch fun, party room, gripper socks, drink,…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Launch Trampoline Park', '891 Boardroom Drive',
    'Prattville, AL 36066', '(334) 568.2041', 'https://launchtrampolinepark.com', NULL, 'Three fun packed packages to choose from. 2 hour and 30 min. All packages include 60 min. of launch fun, party room, gripper socks, drink,…',
    '{"description":"Three fun packed packages to choose from. 2 hour and 30 min.  All packages include 60 min. of launch fun, party room, gripper socks, drink, slice of pizza, special gift for birthday child and paper products. Please visit our website for more details.","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 58, NOW(),
    570
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 59. McWane Center
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'mcwane-center';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'McWane Center', 'mcwane-center', '(205) 714.8369', NULL, 'https://mcwane.org',
      '200 19th Street North', 'Birmingham, AL 35203', 'They do it all – cake, punch, ice cream, paper products and, if you like, goodie bags. If you want a special science demonstration while…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'McWane Center', '200 19th Street North',
    'Birmingham, AL 35203', '(205) 714.8369', 'https://mcwane.org', NULL, 'They do it all – cake, punch, ice cream, paper products and, if you like, goodie bags. If you want a special science demonstration while…',
    '{"description":"They do it all – cake, punch, ice cream, paper products and, if you like, goodie bags. If you want a special science demonstration while you celebrate, they can also provide that. Your group will party in one of the colorful party rooms, then take to the museum floor for a full day of hands-on science fun and discovery. Of course, you can also see a movie while there.","city":"Birmingham","state":"AL","zip":"35203"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 59, NOW(),
    580
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 60. Newtopia
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'newtopia';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Newtopia', 'newtopia', '(334) 356.4518', NULL, 'https://newtopiafunpark.com',
      '3731 Malcolm Drive', 'Montgomery, AL 36116', 'Newtopia is an indoor playground facility designed for children to experience a fun, safe, and inclusive experience. With our party package…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Newtopia', '3731 Malcolm Drive',
    'Montgomery, AL 36116', '(334) 356.4518', 'https://newtopiafunpark.com', NULL, 'Newtopia is an indoor playground facility designed for children to experience a fun, safe, and inclusive experience. With our party package…',
    '{"description":"Newtopia is an indoor playground facility designed for children to experience a fun, safe, and inclusive experience. With our party package you get 80 min. of playtime, 40 min. of party room time,  organic juice and pizza for kids, one free pass for Birthday child, set up and clean up and much, much more. Parents provide cake, cutter and candles. No ice-cream or outside food.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 60, NOW(),
    590
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 61. Prattville East YMCA
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'prattville-east-ymca';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Prattville East YMCA', 'prattville-east-ymca', '(334) 358.9622', NULL, 'https://prattvilleymca.org',
      '972 McQueen Smith Rd.', 'Prattville, AL 36066', 'Party room for members and non-members. Pool rental for members. Party room has a 50% deposit and is $190.00 for non-members and $140 for…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Prattville East YMCA', '972 McQueen Smith Rd.',
    'Prattville, AL 36066', '(334) 358.9622', 'https://prattvilleymca.org', NULL, 'Party room for members and non-members. Pool rental for members. Party room has a 50% deposit and is $190.00 for non-members and $140 for…',
    '{"description":"Party room for members and non-members. Pool rental for members. Party room has a 50%  deposit and is $190.00 for non-members and $140 for members. This includes 1 ½ hours of entertainment, hostess, sheet cake, cups, plates, napkins, silverware for 15 children. Cost for each additional child is $2. Birthday child receives a free t-shirt. You provide ice, ice cream and drinks. Themed parties also available. Call for more details.","city":"Prattville","state":"AL","zip":"36066"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 61, NOW(),
    600
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 62. Rock ‘n Roll Pinball
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'rock-n-roll-pinball';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Rock ‘n Roll Pinball', 'rock-n-roll-pinball', '(334) 363.7625', NULL, 'https://rocknrollpinball.com',
      '815 South Railroad Avenue', 'Opelika, AL 36801', 'We are Family and Party Friendly. Amy Briggs will work with you to set up the most fun, economical, and easy party experience you will ever…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Rock ‘n Roll Pinball', '815 South Railroad Avenue',
    'Opelika, AL 36801', '(334) 363.7625', 'https://rocknrollpinball.com', NULL, 'We are Family and Party Friendly. Amy Briggs will work with you to set up the most fun, economical, and easy party experience you will ever…',
    '{"description":"We are Family and Party Friendly. Amy Briggs will work with you to set up the most fun, economical, and easy party experience you will ever have. Contact akb0049@auburn.edu; 28 Modern, Classic and Vintage Pins, 2 Multicade Video Arcades playing over 500 games, a golden tee game, drinks/snacks, private party room and more!","city":"Opelika","state":"AL","zip":"36801"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 62, NOW(),
    610
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 63. Skyzone Trampoline Park
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'skyzone-trampoline-park';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Skyzone Trampoline Park', 'skyzone-trampoline-park', '(334) 239.2587', NULL, 'https://skyzone.com',
      '5544 Atlanta Hwy.', 'Montgomery, AL 36117', 'The Ultimate trampoline park. Our birthday parties include: 1 hour of jump time and 45 minutes in our private party room. We provide pizza,…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Skyzone Trampoline Park', '5544 Atlanta Hwy.',
    'Montgomery, AL 36117', '(334) 239.2587', 'https://skyzone.com', NULL, 'The Ultimate trampoline park. Our birthday parties include: 1 hour of jump time and 45 minutes in our private party room. We provide pizza,…',
    '{"description":"The Ultimate trampoline park. Our birthday parties include: 1 hour of jump time and 45 minutes in our private party room. We provide pizza, drinks, plates, cups, utensils and napkins. You provide the cake and decorations. Three party packages offered to fit your needs. Please visit our website for more information.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 63, NOW(),
    620
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 64. SMASH IT Rage Room
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'smash-it-rage-room';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'SMASH IT Rage Room', 'smash-it-rage-room', '(334) 633.8555', NULL, NULL,
      '17 Commerce Street', 'Montgomery, AL 36104', 'Let’s Party: 10 people, disc throwing and rage room experience plus a party room with tables n chairs. Outside food&drink are welcome!!…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'SMASH IT Rage Room', '17 Commerce Street',
    'Montgomery, AL 36104', '(334) 633.8555', NULL, NULL, 'Let’s Party: 10 people, disc throwing and rage room experience plus a party room with tables n chairs. Outside food&drink are welcome!!…',
    '{"description":"Let’s Party: 10 people, disc throwing and rage room experience plus a party room with tables n chairs. Outside food&drink are welcome!! Disc throwing-You write stuff you hate onto 12 clay plates, then throw them against the wall breaking them into pieces. In the Rage room experience, you will get weapons (bats, hammers, folding chairs...iykyk) to break furniture, electronics, & 15-20 breakable items.  Please visit our website for more information.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 64, NOW(),
    630
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 65. Top Golf
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'top-golf';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Top Golf', 'top-golf', '(205) 847.5757', NULL, NULL,
      '1111 24th St N', 'Birmingham, AL 35234', 'We host tons of birthday parties, corporate events, holiday parties, bachelor/bachelorette parties and special events. Somebody is always…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Miscellaneous', '{}'::text[],
    TRUE, 'free', 2026, 'Top Golf', '1111 24th St N',
    'Birmingham, AL 35234', '(205) 847.5757', NULL, NULL, 'We host tons of birthday parties, corporate events, holiday parties, bachelor/bachelorette parties and special events. Somebody is always…',
    '{"description":"We host tons of birthday parties, corporate events, holiday parties, bachelor/bachelorette parties and special events. Somebody is always celebrating something. Please visit our website and click on the Parties/events link for individual party pricing.","city":"Birmingham","state":"AL","zip":"35234"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 65, NOW(),
    640
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 66. Montgomery Zoo
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'montgomery-zoo';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Montgomery Zoo', 'montgomery-zoo', '(334) 240.4900', NULL, 'https://montgomeryzoo.com',
      '2301 Coliseum Parkway', 'Montgomery, AL 36110', 'Birthday party packages offered on Saturday and Sunday''s. Bring your guests and we will provide the rest. Please visit our website for…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Outdoors', '{}'::text[],
    TRUE, 'free', 2026, 'Montgomery Zoo', '2301 Coliseum Parkway',
    'Montgomery, AL 36110', '(334) 240.4900', 'https://montgomeryzoo.com', NULL, 'Birthday party packages offered on Saturday and Sunday''s. Bring your guests and we will provide the rest. Please visit our website for…',
    '{"description":"Birthday party packages offered on Saturday and Sunday''s. Bring your guests and we will provide the rest. Please visit our website for Party Packages offered.  Reservations required.","city":"Montgomery","state":"AL","zip":"36110"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 66, NOW(),
    650
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 67. YMCA Camp Chandler
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'ymca-camp-chandler';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'YMCA Camp Chandler', 'ymca-camp-chandler', '(334) 229.0035', NULL, 'https://campchandler.org',
      'Wetumpka, on Lake Jordan 30 minutes from Montgomery', 'Wetumpka, AL 36092', 'Great birthday idea for kids 5 to 15. Ten child minimum. This three hour block of time includes 2-3 activities that you and your child…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Outdoors', '{}'::text[],
    TRUE, 'free', 2026, 'YMCA Camp Chandler', 'Wetumpka, on Lake Jordan 30 minutes from Montgomery',
    'Wetumpka, AL 36092', '(334) 229.0035', 'https://campchandler.org', NULL, 'Great birthday idea for kids 5 to 15. Ten child minimum. This three hour block of time includes 2-3 activities that you and your child…',
    '{"description":"Great birthday idea for kids 5 to 15. Ten child minimum. This three hour block of time includes 2-3 activities that you and your child choose, and starting or ending with meal served in the Dining Hall (if you choose the meal option). Parents may bring cake and ice cream to be served with the meal. Cost with a meal: $21.00 per child (10 child minimum) Cost without a meal: $16.00 per child (10 child minimum) Please call for private party info.","city":"Wetumpka","state":"AL","zip":"36092"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 67, NOW(),
    660
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 68. Millbrook Memorial Ctr & Village Green Park
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'millbrook-memorial-ctr-and-village-green-park';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Millbrook Memorial Ctr & Village Green Park', 'millbrook-memorial-ctr-and-village-green-park', '(334) 290.2047', NULL, 'https://cityofmillbrook.org under parks and recreation tab',
      'On Main Street and Grandview', 'Millbrook, AL 36054', 'Incredible wooden playground with castle, space shuttle, boat, etc. We have picnic tables and picnic shelter. First come first serve.…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Parks', '{}'::text[],
    TRUE, 'free', 2026, 'Millbrook Memorial Ctr & Village Green Park', 'On Main Street and Grandview',
    'Millbrook, AL 36054', '(334) 290.2047', 'https://cityofmillbrook.org under parks and recreation tab', NULL, 'Incredible wooden playground with castle, space shuttle, boat, etc. We have picnic tables and picnic shelter. First come first serve.…',
    '{"description":"Incredible wooden playground with castle, space shuttle, boat, etc. We have picnic tables and picnic shelter. First come first serve. Memorial Center rents for $300 for a one day rental + a $100 security deposit which can be returned upon inspection of facilities and return of the key. Handicap accessible facility.","city":"Millbrook","state":"AL","zip":"36054"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 68, NOW(),
    670
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 69. Montgomery City Parks
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'montgomery-city-parks';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Montgomery City Parks', 'montgomery-city-parks', '(334) 241.2300', NULL, 'https://montgomeryal.gov click on departments and then parks and recreations',
      NULL, 'Montgomery, AL', 'Call to reserve picnic shelters all day for Lagoon Park, Buddy Watson Park, Ida Belle Young Park, Oak Park, Gateway and AUM Park. Make…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Parks', '{}'::text[],
    TRUE, 'free', 2026, 'Montgomery City Parks', NULL,
    'Montgomery, AL', '(334) 241.2300', 'https://montgomeryal.gov click on departments and then parks and recreations', NULL, 'Call to reserve picnic shelters all day for Lagoon Park, Buddy Watson Park, Ida Belle Young Park, Oak Park, Gateway and AUM Park. Make…',
    '{"description":"Call to reserve picnic shelters all day for Lagoon Park, Buddy Watson Park, Ida Belle Young Park, Oak Park, Gateway and AUM Park. Make shelter reservations as early as possible. Pete Peterson Lodge in Lagoon Park is also available for rent and is air conditioned and heated. Gateway Lodge is available  during the week and on the weekend. Gateway has a caterer’s kitchen. This books fast so call early. Please call Parks and Recreation for pricing and more information.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 69, NOW(),
    680
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 70. Prattville Parks
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'prattville-parks';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Prattville Parks', 'prattville-parks', '(334) 595.0800', NULL, 'https://www.prattvilleal.gov',
      NULL, 'Prattville, AL', 'City park shelters are $25 for 4 hrs. & $50 for 8 hrs. The Doster Community Center offers Auditorium, Dining Room and Kitchen, and just…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Parks', '{}'::text[],
    TRUE, 'free', 2026, 'Prattville Parks', NULL,
    'Prattville, AL', '(334) 595.0800', 'https://www.prattvilleal.gov', NULL, 'City park shelters are $25 for 4 hrs. & $50 for 8 hrs. The Doster Community Center offers Auditorium, Dining Room and Kitchen, and just…',
    '{"description":"City park shelters are $25 for 4 hrs. & $50 for 8 hrs.  The Doster Community Center offers Auditorium, Dining Room and Kitchen, and just kitchen.  Upper Kingston Community Center offers large room with capacity of 100.  Please  call Department of Leisure Services to reserve.","city":"Prattville","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 70, NOW(),
    690
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 71. Wetumpka Parks
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'wetumpka-parks';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Wetumpka Parks', 'wetumpka-parks', '(334) 567.5147', NULL, 'https://cityofwetumpka.com',
      NULL, 'Wetumpka, AL', 'Gold Star Park (no rental fee if available), Jeanette Barrett Civic Room in Gold Star Park, Martin Luther King Recreation Center, Civic…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Parks', '{}'::text[],
    TRUE, 'free', 2026, 'Wetumpka Parks', NULL,
    'Wetumpka, AL', '(334) 567.5147', 'https://cityofwetumpka.com', NULL, 'Gold Star Park (no rental fee if available), Jeanette Barrett Civic Room in Gold Star Park, Martin Luther King Recreation Center, Civic…',
    '{"description":"Gold Star Park (no rental fee if available), Jeanette Barrett Civic Room in Gold Star Park, Martin Luther King Recreation Center,  Civic Center in Wetumpka, large room with kitchen. Rates vary on day and hours. Please call for more information.  Call 567.3002 for details about Fort Toulouse/Jackson Park, off US 231, Wetumpka 165-acre park area includes nature trails, campgrounds, picnic pavilion, museum, boat launch, and fort. Would be a great place for either a Pocahontas Party or a Wild West Party. Wetumpka Splash Pad, located at 200 Lancaster Street.","city":"Wetumpka","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 71, NOW(),
    700
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 72. Chick Fil A
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'chick-fil-a';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Chick Fil A', 'chick-fil-a', '(334) 271.0104', NULL, 'https://chick-fil-a.com',
      'All location', 'River Region, AL', 'Playground and reserved section. Kids meal and toy, ice cream and visit from Cow (mascot) on request. Please call your local Chik Fil A for…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Restaurants', '{}'::text[],
    TRUE, 'free', 2026, 'Chick Fil A', 'All location',
    'River Region, AL', '(334) 271.0104', 'https://chick-fil-a.com', NULL, 'Playground and reserved section. Kids meal and toy, ice cream and visit from Cow (mascot) on request. Please call your local Chik Fil A for…',
    '{"description":"Playground and reserved section. Kids meal and toy, ice cream and visit from Cow (mascot) on request. Please call your local Chik Fil A for pricing. Every child gets a balloon.","city":"River Region","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 72, NOW(),
    710
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 73. McDonald’s
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'mcdonalds';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'McDonald’s', 'mcdonalds', NULL, NULL, 'https://mcdonalds.com',
      'All location', 'River Region, AL', 'Call individual stores for cost and details. Most offer similar packages. Cost varies slightly. Includes a Ronald McDonald cake, hamburger…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Restaurants', '{}'::text[],
    TRUE, 'free', 2026, 'McDonald’s', 'All location',
    'River Region, AL', NULL, 'https://mcdonalds.com', NULL, 'Call individual stores for cost and details. Most offer similar packages. Cost varies slightly. Includes a Ronald McDonald cake, hamburger…',
    '{"description":"Call individual stores for cost and details. Most offer similar packages. Cost varies slightly. Includes a Ronald McDonald cake, hamburger kid’s meal, ice cream, hostess, and party favors are supplied. Access to PlayLand after the party.","city":"River Region","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 73, NOW(),
    720
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 74. Nancy’s Italian Ice
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'nancys-italian-ice';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Nancy’s Italian Ice', 'nancys-italian-ice', '(334) 356.1403', NULL, 'https://nancysice.com',
      '7976 Vaughn Rd. (Sturbridge Shopping Center)', 'Montgomery, AL 36116', 'Ice and cupcakes available for purchase.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Restaurants', '{}'::text[],
    TRUE, 'free', 2026, 'Nancy’s Italian Ice', '7976 Vaughn Rd. (Sturbridge Shopping Center)',
    'Montgomery, AL 36116', '(334) 356.1403', 'https://nancysice.com', NULL, 'Ice and cupcakes available for purchase.',
    '{"description":"Ice and cupcakes available for purchase.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 74, NOW(),
    730
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 75. 2211 Ultimate Playzone
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = '2211-ultimate-playzone';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      '2211 Ultimate Playzone', '2211-ultimate-playzone', '(334) 593.7180', NULL, 'https://2211ultimateplayzone.com',
      '3541 McGehee Road', 'Montgomery, AL 36111', 'It''s party time at 2211 Ultimate Playzone! We have several packages to choose from. You may visit our website for more information on…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Skating', '{}'::text[],
    TRUE, 'free', 2026, '2211 Ultimate Playzone', '3541 McGehee Road',
    'Montgomery, AL 36111', '(334) 593.7180', 'https://2211ultimateplayzone.com', NULL, 'It''s party time at 2211 Ultimate Playzone! We have several packages to choose from. You may visit our website for more information on…',
    '{"description":"It''s party time at 2211 Ultimate Playzone! We have several  packages to choose from. You may visit our website for more information on package details.","city":"Montgomery","state":"AL","zip":"36111"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 75, NOW(),
    740
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 76. Eastdale Mall Roller Palace
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'eastdale-mall-roller-palace';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Eastdale Mall Roller Palace', 'eastdale-mall-roller-palace', '(334) 277.2088', NULL, 'https://eastdale-mall.com',
      'Eastdale Mall', 'Montgomery, AL 36117', 'Please call for details and pricing.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Skating', '{}'::text[],
    TRUE, 'free', 2026, 'Eastdale Mall Roller Palace', 'Eastdale Mall',
    'Montgomery, AL 36117', '(334) 277.2088', 'https://eastdale-mall.com', NULL, 'Please call for details and pricing.',
    '{"description":"Please call for details and pricing.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 76, NOW(),
    750
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 77. Skatezone 2000
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'skatezone-2000';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Skatezone 2000', 'skatezone-2000', '(334) 567.4434', NULL, NULL,
      '88 Red Eagle Parkway', 'Wetumpka, AL 36092', 'Several party packages available. Call for details on pricing and options. We offer Laser tag parties.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Places to Party - Skating', '{}'::text[],
    TRUE, 'free', 2026, 'Skatezone 2000', '88 Red Eagle Parkway',
    'Wetumpka, AL 36092', '(334) 567.4434', NULL, NULL, 'Several party packages available. Call for details on pricing and options. We offer Laser tag parties.',
    '{"description":"Several party packages available. Call for details on pricing and options. We offer Laser tag parties.","city":"Wetumpka","state":"AL","zip":"36092"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 77, NOW(),
    760
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 78. Creative Printing
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'creative-printing';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Creative Printing', 'creative-printing', '(334) 281.1315', NULL, 'https://creativeprinting.us.com',
      '2501 East Fifth Street', 'Montgomery, AL 36107', 'Everything is custom made for that extra special birthday.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Printed Invitations', '{}'::text[],
    TRUE, 'free', 2026, 'Creative Printing', '2501 East Fifth Street',
    'Montgomery, AL 36107', '(334) 281.1315', 'https://creativeprinting.us.com', NULL, 'Everything is custom made for that extra special birthday.',
    '{"description":"Everything is custom made for that extra special birthday.","city":"Montgomery","state":"AL","zip":"36107"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 78, NOW(),
    770
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 79. Kwik Kopy Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'kwik-kopy-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Kwik Kopy Shop', 'kwik-kopy-shop', '(334) 244.0444 or (334) 262.8000', NULL, 'https://kwikkopyshop.com',
      '4148 Carmichael Rd. and 448 South Lawrence Street', 'Montgomery, AL 36106 and 36104', 'Print custom invitations. Wide variety of designer invitations for theme parties such as pool, slumber, tea, zoo, carousel, western,…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Printed Invitations', '{}'::text[],
    TRUE, 'free', 2026, 'Kwik Kopy Shop', '4148 Carmichael Rd. and 448 South Lawrence Street',
    'Montgomery, AL 36106 and 36104', '(334) 244.0444 or (334) 262.8000', 'https://kwikkopyshop.com', NULL, 'Print custom invitations. Wide variety of designer invitations for theme parties such as pool, slumber, tea, zoo, carousel, western,…',
    '{"description":"Print custom invitations. Wide variety of designer invitations for theme parties such as pool, slumber, tea, zoo, carousel, western, bowling, skating, dancing, etc. 8 1/2 x 11 designed papers are available for you to do it yourself. Fast turn around.","city":"Montgomery","state":"AL","zip":"36106 and 36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 79, NOW(),
    780
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 80. The Paper Lady
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'the-paper-lady';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'The Paper Lady', 'the-paper-lady', '1 (866) 481.4414', 'donna@thepaperlady.net', 'https://thepaperlady.net',
      NULL, 'Montgomery, AL', 'Specializing in reasonably priced invitations, birth announcements, calling cards, thank you notes and more. Also an authorized Sweet Pea…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Printed Invitations', '{}'::text[],
    TRUE, 'free', 2026, 'The Paper Lady', NULL,
    'Montgomery, AL', '1 (866) 481.4414', 'https://thepaperlady.net', 'donna@thepaperlady.net', 'Specializing in reasonably priced invitations, birth announcements, calling cards, thank you notes and more. Also an authorized Sweet Pea…',
    '{"description":"Specializing in reasonably priced invitations, birth announcements, calling cards, thank you notes and more. Also an authorized Sweet Pea Designs dealer.","city":"Montgomery","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 80, NOW(),
    790
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 81. Alabama Shakespeare Festival Gift Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'alabama-shakespeare-festival-gift-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Alabama Shakespeare Festival Gift Shop', 'alabama-shakespeare-festival-gift-shop', '(334) 271.5358', NULL, 'https://asf.net',
      'Blount Cultural Park', 'Montgomery, AL 36117', 'Theatre-related gifts. Open during performance hours, one hour prior to show and through intermission. Contact box office for show times.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Alabama Shakespeare Festival Gift Shop', 'Blount Cultural Park',
    'Montgomery, AL 36117', '(334) 271.5358', 'https://asf.net', NULL, 'Theatre-related gifts. Open during performance hours, one hour prior to show and through intermission. Contact box office for show times.',
    '{"description":"Theatre-related gifts. Open during performance hours, one hour prior to show and through intermission. Contact box office for show times.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 81, NOW(),
    800
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 82. Barb’s on Mulberry
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'barbs-on-mulberry';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Barb’s on Mulberry', 'barbs-on-mulberry', '(334) 544.0303', NULL, 'https://barbsonmulberry.com',
      '1923 Mulberry Street', 'Montgomery, AL 36106', 'Will personalize lots of gift items. Choose from a wide variety of unique and personalized gifts. Closed on Mondays. We now do birthday…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Barb’s on Mulberry', '1923 Mulberry Street',
    'Montgomery, AL 36106', '(334) 544.0303', 'https://barbsonmulberry.com', NULL, 'Will personalize lots of gift items. Choose from a wide variety of unique and personalized gifts. Closed on Mondays. We now do birthday…',
    '{"description":"Will personalize lots of gift items. Choose from a wide variety of unique and personalized gifts. Closed on Mondays. We now do birthday parties. Please call for more details!","city":"Montgomery","state":"AL","zip":"36106"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 82, NOW(),
    810
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 83. Embellish
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'embellish';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Embellish', 'embellish', '(334) 649.2022', NULL, 'https://preppymonogrammedgifts.com',
      '8111 Vaughn Road', 'Montgomery, AL 36116', 'Large selection of items to be monogrammed. Book bags, Scout bags, Brush Fire T-shirts, jewelry, tumblers and many, many more.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Embellish', '8111 Vaughn Road',
    'Montgomery, AL 36116', '(334) 649.2022', 'https://preppymonogrammedgifts.com', NULL, 'Large selection of items to be monogrammed. Book bags, Scout bags, Brush Fire T-shirts, jewelry, tumblers and many, many more.',
    '{"description":"Large selection of items to be monogrammed. Book bags, Scout bags, Brush Fire T-shirts, jewelry, tumblers and many, many more.","city":"Montgomery","state":"AL","zip":"36116"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 83, NOW(),
    820
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 84. Goat Hill Museum Store
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'goat-hill-museum-store';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Goat Hill Museum Store', 'goat-hill-museum-store', '(334) 353.4969', 'goathill@preserveala.org', NULL,
      'located in Alabama’s State Capitol Building', 'Montgomery, AL 36130', 'Civil War, Civil Rights- Books, Local Artwork, Toys, Collectibles, Ornaments, Music, Videos, Cookbooks, Pottery, Souvenirs, and Unique…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Goat Hill Museum Store', 'located in Alabama’s State Capitol Building',
    'Montgomery, AL 36130', '(334) 353.4969', NULL, 'goathill@preserveala.org', 'Civil War, Civil Rights- Books, Local Artwork, Toys, Collectibles, Ornaments, Music, Videos, Cookbooks, Pottery, Souvenirs, and Unique…',
    '{"description":"Civil War, Civil Rights- Books, Local Artwork, Toys, Collectibles, Ornaments, Music, Videos, Cookbooks, Pottery, Souvenirs, and Unique Southern Gifts. Union Street Entrance. Open Mon.-Fri, 8:00 – 4:30 and Sat. from 9-4 (Sat. please enter through the Union St. entrance).","city":"Montgomery","state":"AL","zip":"36130"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 84, NOW(),
    830
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 85. Heather Pierce Designs
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'heather-pierce-designs';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Heather Pierce Designs', 'heather-pierce-designs', '(334) 676.1807', NULL, NULL,
      '1947 Berry Chase Place', 'Montgomery, AL 36117', 'Heather Pierce Designs specializes in personalized gifts. We offer tile décor including tumbled marble coasters, trivets and magnets.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Heather Pierce Designs', '1947 Berry Chase Place',
    'Montgomery, AL 36117', '(334) 676.1807', NULL, NULL, 'Heather Pierce Designs specializes in personalized gifts. We offer tile décor including tumbled marble coasters, trivets and magnets.',
    '{"description":"Heather Pierce Designs specializes in personalized gifts. We offer tile décor including tumbled marble coasters, trivets and magnets.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 85, NOW(),
    840
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 86. Little Ladd''s Embroidery
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'little-ladds-embroidery';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Little Ladd''s Embroidery', 'little-ladds-embroidery', NULL, NULL, NULL,
      NULL, 'Auburn, AL', 'At Little Lad''s, we specialize in embroidery for baby clothes and accessories, perfect for adding a personal touch to any wardrobe. From…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Little Ladd''s Embroidery', NULL,
    'Auburn, AL', NULL, NULL, NULL, 'At Little Lad''s, we specialize in embroidery for baby clothes and accessories, perfect for adding a personal touch to any wardrobe. From…',
    '{"description":"At Little Lad''s, we specialize in embroidery for baby clothes and accessories, perfect for adding a personal touch to any wardrobe.  From name and monograms, to sweet and timeless designs, each piece is made with care and attention to detail.                                            Follow us on Instagram where you can find our creations and message us to order: @littleladdsembroidery.","city":"Auburn","state":"AL","zip":""}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 86, NOW(),
    850
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 87. Montgomery Museum of Fine Arts Gift Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'montgomery-museum-of-fine-arts-gift-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Montgomery Museum of Fine Arts Gift Shop', 'montgomery-museum-of-fine-arts-gift-shop', '(334) 240.4337', NULL, 'https://mmfa.org',
      'Blount Cultural Park', 'Montgomery, AL 36117', 'You will find a wide assortment of unique gifts that are handcrafted by local artists for that special someone.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Montgomery Museum of Fine Arts Gift Shop', 'Blount Cultural Park',
    'Montgomery, AL 36117', '(334) 240.4337', 'https://mmfa.org', NULL, 'You will find a wide assortment of unique gifts that are handcrafted by local artists for that special someone.',
    '{"description":"You will find a wide assortment of unique gifts that are handcrafted by local artists for that special someone.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 87, NOW(),
    860
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 88. Montgomery Zoo Gift Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'montgomery-zoo-gift-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Montgomery Zoo Gift Shop', 'montgomery-zoo-gift-shop', '(334) 240.4900', NULL, 'https://montgomeryzoo.com',
      '2301 Coliseum Parkway, Off the Northern Blvd.', 'Montgomery, AL 36110', 'Animal-related toys, shirts, masks, jewelry. Great gifts for the animal lover.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Montgomery Zoo Gift Shop', '2301 Coliseum Parkway, Off the Northern Blvd.',
    'Montgomery, AL 36110', '(334) 240.4900', 'https://montgomeryzoo.com', NULL, 'Animal-related toys, shirts, masks, jewelry. Great gifts for the animal lover.',
    '{"description":"Animal-related toys, shirts, masks, jewelry. Great gifts for the animal lover.","city":"Montgomery","state":"AL","zip":"36110"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 88, NOW(),
    870
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 89. Old Alabama Town Gift Shop
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'old-alabama-town-gift-shop';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Old Alabama Town Gift Shop', 'old-alabama-town-gift-shop', '(334) 240.4500', NULL, 'https://oldalabamatown.com',
      '301 Columbus St.', 'Montgomery, AL 36104', 'Regional and old-fashioned gift items.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Old Alabama Town Gift Shop', '301 Columbus St.',
    'Montgomery, AL 36104', '(334) 240.4500', 'https://oldalabamatown.com', NULL, 'Regional and old-fashioned gift items.',
    '{"description":"Regional and old-fashioned gift items.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 89, NOW(),
    880
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 90. Periwinkles
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'periwinkles';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Periwinkles', 'periwinkles', '(334) 277.3570', 'shop.periwinkle@gmail.com', NULL,
      '8193 Vaughn Road', 'Montgomery, AL 36117', 'Make your gift decisions from a large selection of popular items in our store.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Periwinkles', '8193 Vaughn Road',
    'Montgomery, AL 36117', '(334) 277.3570', NULL, 'shop.periwinkle@gmail.com', 'Make your gift decisions from a large selection of popular items in our store.',
    '{"description":"Make your gift decisions from a large selection of popular items in our store.","city":"Montgomery","state":"AL","zip":"36117"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 90, NOW(),
    890
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 91. The Shoppes at My Kids Attic
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'the-shoppes-at-my-kids-attic';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'The Shoppes at My Kids Attic', 'the-shoppes-at-my-kids-attic', '(334) 270.1456', NULL, 'https://mykidsattic.biz',
      '401 Coliseum Blvd. Eastbrook Shopping Center', 'Montgomery, AL 36109', 'We offer something for the everything in your life. Specialty gifts, home décor, candles, jewelry, pewter, children’s couture, vinyl and…', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'The Shoppes at My Kids Attic', '401 Coliseum Blvd. Eastbrook Shopping Center',
    'Montgomery, AL 36109', '(334) 270.1456', 'https://mykidsattic.biz', NULL, 'We offer something for the everything in your life. Specialty gifts, home décor, candles, jewelry, pewter, children’s couture, vinyl and…',
    '{"description":"We offer something for the everything in your life. Specialty gifts, home décor, candles, jewelry, pewter, children’s couture, vinyl and monogrammed gifts.","city":"Montgomery","state":"AL","zip":"36109"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 91, NOW(),
    900
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
  -- 92. Tucker Pecan Company
  SELECT id INTO v_acct_id FROM advertiser_accounts WHERE slug = 'tucker-pecan-company';
  IF v_acct_id IS NULL THEN
    INSERT INTO advertiser_accounts (
      business_name, slug, office_phone, contact_email, website_url,
      address, city_state_zip, card_hook, is_active
    ) VALUES (
      'Tucker Pecan Company', 'tucker-pecan-company', '(334) 262.4470', NULL, 'https://tuckerpecan.com',
      '350 N McDonough St.', 'Montgomery, AL 36104', 'Come by and visit us for a unique selection of gifts, tumblers, jewelry and more.', TRUE
    ) RETURNING id INTO v_acct_id;
  END IF;
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, extra_categories,
    is_published, listing_tier, listing_year, business_name, address,
    city_state_zip, office_phone, website_url, contact_email, card_hook,
    guide_data, source_csv_filename, source_csv_row_number, imported_at,
    display_order
  ) VALUES (
    v_acct_id, 'birthday-party', 'Unique Gifts for Kids and Adults', '{}'::text[],
    TRUE, 'free', 2026, 'Tucker Pecan Company', '350 N McDonough St.',
    'Montgomery, AL 36104', '(334) 262.4470', 'https://tuckerpecan.com', NULL, 'Come by and visit us for a unique selection of gifts, tumblers, jewelry and more.',
    '{"description":"Come by and visit us for a unique selection of gifts, tumblers, jewelry and more.","city":"Montgomery","state":"AL","zip":"36104"}'::jsonb, 'RRP Birthday Guide 2026 v2.csv', 92, NOW(),
    910
  ) ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
    SET category         = EXCLUDED.category,
        extra_categories = EXCLUDED.extra_categories,
        is_published     = TRUE,
        updated_at       = NOW();
END $$;

COMMIT;

-- Post-import sanity check:
-- SELECT category, COUNT(*)
--   FROM guide_listings
--  WHERE guide_type_slug='birthday-party' AND is_published=true AND listing_year=2026
--  GROUP BY category ORDER BY category;
