-- Migration 226: Refresh the 8 pre-existing directory_only accounts from the 2026-27 CSV
--
-- The guide renders from advertiser_accounts, not from guide_listings. 224
-- refreshed the listings and 225 linked them to accounts, but 8 of those
-- accounts already existed (created 21 June) and still held older values — so
-- the refreshed listing data was not what the page actually displayed. One was
-- rendering a corrupted business name, "P�ZAZZ ART STUDIO", live on the site, and
-- Family Karate Center was showing a phone number the new CSV replaces.
--
-- These are kind='directory_only': they exist solely to make directory
-- listings render, so the guide CSV is legitimately their source of truth.
--
-- The 6 real kind='advertiser' accounts that also differ are deliberately NOT
-- touched. Those are CRM-maintained master business records for paying
-- advertisers, and a spreadsheet should not silently overwrite a phone number
-- or address that someone maintains by hand. Listed for review instead:
-- Alabama Dance Theatre, Dance Generation, Alabama River Region Ballet,
-- Tonya Speed's Dance Connection, Prattville YMCA, Read Write Learning Center.
--
-- 'category' is deliberately not synced: on advertiser_accounts it is the CRM
-- classification ('family-service'), while the guide reads its category from
-- guide_listings.category.
--
-- The kind guard makes this safe to re-run and impossible to widen by accident.

BEGIN;

UPDATE advertiser_accounts SET
  business_name  = 'Bowlero',
  website_url    = 'https://bowlero.com',
  office_phone   = '(334) 819.7171',
  city_state_zip = 'Montgomery, AL 36117',
  address        = '1661 Eastern Blvd.',
  card_hook      = 'Youth Leagues will be starting up in the fall. You may come in and sign up anytime.',
  updated_at     = NOW()
WHERE slug = 'bowlero' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'NextGen Martial Arts, Prattville',
  website_url    = 'https://nextgenmartialarts.com',
  office_phone   = '(334) 590.3759',
  city_state_zip = 'Prattville, AL 36066',
  address        = '698 Old Farm Lane N',
  card_hook      = 'Tang Soo Do, Li’l Dragons (4-6 years) and XMA (Xtreme Martial Arts) offered. Many programs available.',
  updated_at     = NOW()
WHERE slug = 'nextgen-martial-arts-prattville' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'Fleming''s Martial Arts',
  website_url    = 'https://flemingsmartialarts.net',
  office_phone   = '(334) 277.5425',
  city_state_zip = 'Montgomery, AL 36117',
  address        = '5521 Wares Ferry Road',
  card_hook      = 'Classes for children and adults. A structured, systematic curriculum is offered in a focused and safe training environment.',
  updated_at     = NOW()
WHERE slug = 'flemings-martial-arts' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'P''Zazz Art Studio',
  website_url    = 'https://pzazzart.com',
  office_phone   = '(334) 354.1975',
  city_state_zip = 'Prattville, AL 36066',
  address        = '1812 Glynnwood Drive',
  card_hook      = 'Fall classes start in September. Pick a day and time that fit your schedule. Classes meet once a week. $60 for the month. $20 supply fee per semester. This cove',
  updated_at     = NOW()
WHERE slug = 'pzazz-art-studio' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'Snapology',
  website_url    = NULL,
  office_phone   = '(334) 325.4679',
  city_state_zip = 'Montgomery, AL',
  address        = NULL,
  card_hook      = 'Ages 6-14. Take time off your hands while your kids play, learn, and make life long friends. We offer amazing themes for our camps and workshops year-round incl',
  updated_at     = NOW()
WHERE slug = 'snapology' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'Family Karate Center',
  website_url    = 'https://montgomeryfamilykarate.com',
  office_phone   = '(334) 277.4911',
  city_state_zip = 'Montgomery, AL 36117',
  address        = '8159 Vaughn Rd, Peppertree Shopping Center',
  card_hook      = 'Montgomery’s Christian Martial Arts. Mon.- Saturday (ages 2 and up): No enrollment fee, no contract. Specialize in ADD, LD, handicapped, mentally challenged, vi',
  updated_at     = NOW()
WHERE slug = 'family-karate-center' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = 'Adventure Sports Aquatic Center',
  website_url    = 'https://advsports2.com',
  office_phone   = '(334) 269.3483',
  city_state_zip = 'Montgomery, AL 36107',
  address        = '1546 E. Ann Street',
  card_hook      = 'Heated indoor pool year round. Swimming Lessons, Scuba and Life Guard Classes.',
  updated_at     = NOW()
WHERE slug = 'adventure-sports-aquatic-center' AND kind = 'directory_only';

UPDATE advertiser_accounts SET
  business_name  = '2211 Ultimate Playzone',
  website_url    = 'https://2211ultimateplayzone.com',
  office_phone   = '(334) 593.7180',
  city_state_zip = 'Montgomery, AL 36111',
  address        = '3541 McGehee Road',
  card_hook      = 'Skating, birthday parties and Inflatables. Laser Tag! Summer Open Skate and much more! Please visit our website for regular and holiday hours during current sea',
  updated_at     = NOW()
WHERE slug = '2211-ultimate-playzone' AND kind = 'directory_only';

COMMIT;

-- Verify:
--   SELECT slug, business_name, office_phone FROM advertiser_accounts
--    WHERE slug IN ('family-karate-center', 'pzazz-art-studio', 'bowlero', 'nextgen-martial-arts-prattville', 'flemings-martial-arts', 'snapology', '2211-ultimate-playzone', 'adventure-sports-aquatic-center');
--   -- expect no replacement characters, and phones matching the 26-27 CSV
