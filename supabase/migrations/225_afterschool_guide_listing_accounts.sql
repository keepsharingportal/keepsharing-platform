-- Migration 225: Link every After-School Guide listing to an advertiser_accounts row
--
-- WHY THIS EXISTS
-- GuideDetailPage and ListingDetailPage render a listing only through its
-- joined advertiser_accounts row — `if (!a) return null`. Migration 134 added
-- inline business identity columns to guide_listings, but neither template was
-- ever taught to read them, so a listing without an account renders as nothing
-- at all.
--
-- The After-School Guide had 85 listings and 6 accounts, so the public page was
-- showing 6 of them and looked unbuilt. This links all 80 published 2026-27
-- listings, following the pattern migration 211 established for the Birthday
-- Party Guide (the only guide that renders in full today, because 211 gave all
-- 192 of its rows accounts).
--
-- 8 of the 80 already had a matching advertiser_accounts row and are reused
-- rather than duplicated — matched on slug, then on normalized business name,
-- so an existing business never gets a second record. 66 were created new with
-- kind='directory_only', which keeps the CRM Businesses view clean while
-- detail pages and the render pipeline work.
--
-- Idempotent: re-running reuses any slug that already exists and only re-points
-- the guide_listings FK.
--
-- STILL OUTSTANDING (not fixed here): the same 6-of-85 problem affects
-- special-needs (2 of 139), summer-camp (4 of 122), summer-fun (5 of 125),
-- healthy-kids (4 of 71), childcare (1 of 48) and private-school (7 of 38).
-- Those guides are still rendering a tiny fraction of their listings. The
-- durable fix is to teach the templates to fall back to the inline columns
-- rather than to keep minting accounts guide by guide.

BEGIN;

DO $$
DECLARE
  v_acct UUID;
BEGIN

  -- 2211 Ultimate Playzone
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = '2211-ultimate-playzone';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('2211 Ultimate Playzone', '2211-ultimate-playzone', 'directory_only', 'family-service', 'https://2211ultimateplayzone.com', '(334) 593-7180', NULL, '3541 McGehee Road', 'Montgomery, AL, 36111', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '6a0a6e52-62e3-487f-b7eb-6dcfdef600ab';

  -- Abrakadoodle Art Education
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'abrakadoodle-art-education';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Abrakadoodle Art Education', 'abrakadoodle-art-education', 'directory_only', 'Art and Music', 'https://abrakadoodle.com/al-montgomery-register/', NULL, 'mcornwell@abrakadoodle.com', NULL, 'Montgomery, AL', 'Classes hosted at your school. Plus, Home School and Studio classes throughout the Fall and Spring. Online registration is open now! We also offer summer camps,', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'b481f788-4abf-45c8-9b0c-f963b452e81c';

  -- Adventure Sports Aquatic Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'adventure-sports-aquatic-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Adventure Sports Aquatic Center', 'adventure-sports-aquatic-center', 'directory_only', 'family-service', 'https://adventuresports2.com', '(334) 269-3483', NULL, '1546 East Ann Street', 'Montgomery, AL, 36107', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '2ed35122-d02c-4a54-8b36-6f9e4ad7e003';

  -- Alabama Dance Theatre
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'alabama-dance-theatre';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Alabama Dance Theatre', 'alabama-dance-theatre', 'directory_only', 'family-service', 'https://alabamadancetheatre.com', '(334) 625-2590', NULL, '1018 Madison Avenue', 'Montgomery, AL, 36104', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '441c3940-aae1-496f-bc94-5eb78c817bb7';

  -- Alabama Nature Center  Fall Homeschool classes
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'alabama-nature-center-fall-homeschool-classes';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Alabama Nature Center  Fall Homeschool classes', 'alabama-nature-center-fall-homeschool-classes', 'directory_only', 'Recreational & Sports', 'https://alabamawildlife.org/homeschool-programs/', '(334) 285.4550', NULL, '3050 Lanark Road', 'Millbrook, AL 36054', 'Fall registration for the 8 classes is open on the website. $80.00 per child for the 8 class program. There is a $5 per sibling discount for each family. Class ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '7005bfdd-eda1-4c73-9795-11c34995a54e';

  -- Alabama River Region Ballet
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'alabama-river-region-ballet';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Alabama River Region Ballet', 'alabama-river-region-ballet', 'directory_only', 'family-service', 'https://alabamariverregionballet.com', '(334) 356-5460', 'riverregionballet@gmail.com', '7981 Vaughn Road', 'Montgomery, AL, 36116', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '83876350-8529-41b3-a742-f56842d2047a';

  -- Alabama Shakespeare Festival: Acting Academy
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'alabama-shakespeare-festival-acting-academy';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Alabama Shakespeare Festival: Acting Academy', 'alabama-shakespeare-festival-acting-academy', 'directory_only', 'Drama Classes & Public Speaking', 'https://asf.net', '(334) 271.5324', 'glambert@asf.net', '1 Festival Drive', 'Montgomery, AL 36117', 'Learn more about the craft of acting at ASF’s Acting Academy. Fall Academy classes are open to new and returning students and will feature different content and', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '080caeb0-13d1-4514-bb09-2c6bb8f8b92c';

  -- Armory Athletics Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'armory-athletics-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Armory Athletics Center', 'armory-athletics-center', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://armoryathletics.com', '(334) 241.2789', 'armoryathletics1@gmail.com', '1018 Madison Ave.', 'Montgomery, AL 36104', 'Fall classes begin in August. Ongoing registration. Various leveled classes offered in Gymnastics, Tumbling, and Ninja. Ages 3-18, all skill levels. Cheer, Comp', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'dd95420a-4252-4bad-9334-384128d1d5d6';

  -- BAMA Lanes
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'bama-lanes';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('BAMA Lanes', 'bama-lanes', 'directory_only', 'Bowling', 'https://bamalanes.com', '(334) 272.5423', NULL, '3020 Atlanta Highway', 'Montgomery, AL 36109', 'Youth leagues on Fridays at 6:30. Ages 3-20. Pre-registration with free bowling.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'ef94ae7a-73f8-46f7-a025-b86a0ce947f2';

  -- BAMA Lanes in Prattville
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'bama-lanes-in-prattville';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('BAMA Lanes in Prattville', 'bama-lanes-in-prattville', 'directory_only', 'Bowling', 'https://bamalanesprattville.com', '(334) 358.8600', NULL, '1734 East Main Street', 'Prattville, AL 36066', 'Youth leagues on Saturdays. Ages 3-20. Registration will begin in August. Youth leagues start in September. Please call for more information. Free bowling with ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '2b0f92e7-ae39-4d5a-ac89-a704a3cb0281';

  -- Better Than Average
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'better-than-average';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Better Than Average', 'better-than-average', 'directory_only', 'Tutoring', 'https://betterthanaverage.online', '(334) 802.1315', NULL, '2820 Fairlane Dr., Suite A3', 'Montgomery, AL 36116', 'Building Confidence. Creating individuals who love learning. Our peer tutors aim to build relationships with our students to make learning more engaging and rel', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'bc066f89-7dfc-4068-8eef-97eea5bf66f7';

  -- Bowlero
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'bowlero';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Bowlero', 'bowlero', 'directory_only', 'family-service', 'bowlero.com', '(334) 819.7171', NULL, '1661 Eastern Blvd.', 'Montgomery', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '80a2696d-bc53-407a-a120-00c37efcda89';

  -- Boy Scouts
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'boy-scouts';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Boy Scouts', 'boy-scouts', 'directory_only', 'Recreational & Sports', 'https://tukabatcheebsa.org', '(334) 262.2697', NULL, '3067 Carter Hill Rd.', 'Montgomery, AL 36111', 'About 100 Cub Scout packs located in various private and public schools, churches, etc. August/September, city wide Fall Recruitment night for Scouts, parents c', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '0d84a998-3957-4b57-ac5e-740a57881406';

  -- Boys & Girls Clubs of the River Region
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'boys-and-girls-clubs-of-the-river-region';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Boys & Girls Clubs of the River Region', 'boys-and-girls-clubs-of-the-river-region', 'directory_only', 'Recreational & Sports', 'https://bgcmala.org', '(334) 832.4288', NULL, '412 North Hull Street', 'Montgomery, AL 36104', 'Chisholm, (334) 265.2469, 2612 Lower Wetumpka Rd. West End, (334) 263.3371, 220 Crenshaw Street Wetumpka, (334) 478.4904 499 Alabama Street Provides programs an', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '42a1c0d4-7b5a-41d3-abcb-7d357852f787';

  -- C.J.’s Dance Factory (home of the Prattville Ballet)
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'c-j-s-dance-factory-home-of-the-prattville-ballet';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('C.J.’s Dance Factory (home of the Prattville Ballet)', 'c-j-s-dance-factory-home-of-the-prattville-ballet', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://cjsdancefactory.com', '(334) 467.8603', NULL, '145 S. Court St.', 'Prattville, AL 36067', 'Registration on Thursdays in Prattville 5:30-7:00. Instruction in: Classical Ballet/Pointe, Jazz/Lyrical, Tap, PowerTumble Gymnastics and Preschool Dance (ages ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'ca336f61-754d-4d78-b06a-4bc545946f24';

  -- Caesar Chess
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'caesar-chess';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Caesar Chess', 'caesar-chess', 'directory_only', 'Miscellaneous', NULL, '334-868-0271', 'CaesarChess@gmail.com', NULL, 'Montgomery, AL', 'Teaching kids to play chess in metro Montgomery. ** Public ** Private ** Homeschooled ** Caesar Lawrence – Director & Chess Coach', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'aebdb117-d5a6-41be-9ed6-9b054490a885';

  -- CCJ
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'ccj';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('CCJ', 'ccj', 'directory_only', 'Volleyball', 'https://Capitalcityjuniors.com', '(866) 942.2509', 'info@capitalcityjuniors.com', '5334 Atlanta Hwy.', 'Montgomery, AL 36109', 'Capital City Juniors is the premier organization for girls club volleyball in Montgomery. Our mission is to blend passion with perspective and to combine the lo', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '0d626c6c-1290-4e63-884e-2d38fe2cd71f';

  -- Churches
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'churches';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Churches', 'churches', 'directory_only', 'Recreational & Sports', 'https://awana.org', NULL, NULL, NULL, 'Montgomery, AL', 'Check local churches for programs. AWANA Programs are popular.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '20c34855-8aef-4980-9be6-c73758b55775';

  -- Dance Generation
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'dance-generation';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Dance Generation', 'dance-generation', 'directory_only', 'family-service', 'https://dancegenerationstudio.com', '(334) 395-4300', NULL, '65 Ashburton Drive', 'Montgomery, AL, 36117', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'f43f53b7-f296-4454-96bc-92d7184bc77b';

  -- Daycares
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'daycares';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Daycares', 'daycares', 'directory_only', 'Recreational & Sports', NULL, NULL, NULL, NULL, 'Montgomery, AL', 'Please check with local daycare centers for the option of after school care. Check out Montgomery Parents on the web at www.montgomeryparents.com and use our ar', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '3e06f180-5af6-4544-8ca0-515fff8727de';

  -- Doster Center, Prattville
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'doster-center-prattville';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Doster Center, Prattville', 'doster-center-prattville', 'directory_only', 'Recreational & Sports', NULL, '(334) 361.3640', NULL, '101 West Main Street', 'Prattville, AL 36066', 'Various after school activities include Afterschool Recreation Club for grades K-6th. Monday – Friday, 3 p.m. – 6 p.m. (After school transportation provided.), ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '2a8624f5-df6f-4e06-9f0a-e1e9110291dc';

  -- Ed Tech Academy
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'ed-tech-academy';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Ed Tech Academy', 'ed-tech-academy', 'directory_only', 'Tutoring', 'https://edtechacademy.org', '(334) 296.2393', 'info@edtechacademy.org', NULL, 'Montgomery, AL 36116', 'Do you want to see an improvement in your child’s academics? Offering STEM and technology daytime and afternoon programs. Tutoring, adult classes, parent’s nigh', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '530b1037-dac8-4ddd-82b7-cd5ff3578d07';

  -- Enjoy Learning Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'enjoy-learning-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Enjoy Learning Center', 'enjoy-learning-center', 'directory_only', 'Tutoring', 'https://enjoylearningcenter.com', '(334) 625.9535', 'fb@enjoylearningcenter.com', '2801 Vaughn Plaza Rd., Suite H', 'Montgomery, AL 36116', 'One-on-one tutoring for ages 4 to adult. Math, science, chemistry, reading, comprehension, phonics, spelling, writing, graduation exit exam, ACT and SAT. Certif', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '7f5d1c87-1fde-436d-b54b-af94c27d43a2';

  -- Evolve Dance Company
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'evolve-dance-company';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Evolve Dance Company', 'evolve-dance-company', 'directory_only', 'Dance, Gymnastics & Cheer', NULL, '(334) 730.0310', 'info@efsta.com', '2072 Fairview Avenue (Pratt''s Mill Shopping Center)', 'Prattville, AL 36066', 'We offer a variety of styles of dance for ages 2 and older. Please check our website for fall class dates.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '768819df-ecaf-4b9a-a35b-9ca46fe0b096';

  -- Family Karate Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'family-karate-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Family Karate Center', 'family-karate-center', 'directory_only', 'family-service', NULL, '(334) 220-9319', NULL, '8159 Vaughn Road', 'Montgomery, AL, 36116', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '82fc0425-94fd-4b41-8abb-5c1edaa1b3e6';

  -- FC Montgomery Futsal Soccer
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'fc-montgomery-futsal-soccer';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('FC Montgomery Futsal Soccer', 'fc-montgomery-futsal-soccer', 'directory_only', 'Soccer', 'https://fcmontgomery.com', '(334) 207.5442', 'brunomr@fcmontgomery.com', '5334 Atlanta Hwy.', 'Montgomery, AL 36117', 'Outdoor Travel Soccer and Indoor Local Futsal club. A variety of programs offered, including; Soccer Camps, 3v3 Tourneys, Lessons, Soccer Parties, Soccer Tours ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '1e3b70a6-98af-44c2-a0a8-011b6ad2b64a';

  -- Fleming's Martial Arts
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'flemings-martial-arts';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Fleming''s Martial Arts', 'flemings-martial-arts', 'directory_only', 'family-service', 'https://flemingsmartialarts.net', '(334) 277-5425', NULL, '5521 Wares Ferry Road', 'Montgomery, AL, 36117', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '70330b62-0297-4e6d-b5e4-2dc066d11222';

  -- Foxwood Farms
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'foxwood-farms';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Foxwood Farms', 'foxwood-farms', 'directory_only', 'Horses', 'https://foxwoodfarms.biz', '(334) 546.7622', NULL, NULL, 'Pike Road, AL 36064', 'Safe and structured lessons offered from beginning riders to experienced competitors. Lessons are taught on a semester basis. Please visit our website for rates', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'dcc01fd9-c112-4dad-8c0e-713f7e61f3fb';

  -- Frazer Sonshine Soccer
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'frazer-sonshine-soccer';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Frazer Sonshine Soccer', 'frazer-sonshine-soccer', 'directory_only', 'Soccer', 'https://frazer.church', '(334) 495.6458', NULL, 'Atlanta Hwy.', 'Montgomery, AL 36117', 'Held at Frazer Soccer Fields will be held in the Spring. Ages 5-12.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '4d0a07cc-b57c-496f-bab5-f18ebecdbe83';

  -- Frazer Upward Basketball
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'frazer-upward-basketball';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Frazer Upward Basketball', 'frazer-upward-basketball', 'directory_only', 'Recreational & Sports', 'https://frazer.church', '(334) 495.6459', NULL, 'Atlanta Hwy', 'Montgomery, AL 36117', 'Program available for girls 5 years through 8th grade and boys 5 years through 8th grade. Registration only during the month of October. Practice begins in Dece', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'c3721941-8e26-4be0-a27d-220397835f22';

  -- Frazer Upward Football & Cheerleading
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'frazer-upward-football-and-cheerleading';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Frazer Upward Football & Cheerleading', 'frazer-upward-football-and-cheerleading', 'directory_only', 'Recreational & Sports', 'https://frazer.church', '(334) 495.6459', NULL, 'Atlanta Hwy', 'Montgomery, AL 36117', 'Registration begins July and runs through August. Program offered Aug.-Oct. for rising 1st- 6th grade. Spiritual development through devotionals, coaching and a', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '70f23942-5c68-4f93-9ab1-175ec21edf1f';

  -- Girl Scouts
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'girl-scouts';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Girl Scouts', 'girl-scouts', 'directory_only', 'Recreational & Sports', 'https://girlscoutssa.org', '(800) 239.6636', NULL, '2501 Bell Road', 'Montgomery, AL 36117', 'Daisies, Brownies and Girl Scouts. Girls discover who they are, where their talents lie, and what they care the most about. And they take action to change the w', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '4e9293da-4b6d-418c-b17c-518465e9adf2';

  -- Guitar Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'guitar-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Guitar Center', 'guitar-center', 'directory_only', 'Art and Music', 'https://stores.guitarcenter.com/montgomery', '(334) 396-6245', NULL, '2572 Eastern Blvd', 'Montgomery, AL 36117', 'Guitar Center offers private 1-on-1 music lessons. Learning to play music can be an amazing, life-changing experience. Our fully-engaging lesson program provide', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '4a3c31fb-36e5-42e1-92e7-d8caa6149fef';

  -- Hampstead Tennis
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'hampstead-tennis';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Hampstead Tennis', 'hampstead-tennis', 'directory_only', 'Tennis', NULL, '(334) 207.9821', 'Hampsteadtennis@att.net', 'Hampstead', 'Montgomery, AL 36116', 'Tennis lessons open to both residents and visitors interested in enjoying the fun of tennis. Players welcomed from beginner to advanced level play of ages, and ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '28de74ef-45d1-49fb-afd9-c05bc0c9af32';

  -- Huntington Learning Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'huntington-learning-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Huntington Learning Center', 'huntington-learning-center', 'directory_only', 'Tutoring', 'https://huntingtonhelps.com', '(334) 277.9200', NULL, '3251 Malcolm Drive', 'Montgomery, AL 36116', 'One on one instruction in a specific course. Tutoring for K-12 in reading, all levels of math, study skills, writing, phonics, vocabulary and more. SAT, ACT PSA', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '70f35207-d11a-43a0-a5c6-bcb269188faf';

  -- Johnson Karate and Fitness Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'johnson-karate-and-fitness-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Johnson Karate and Fitness Center', 'johnson-karate-and-fitness-center', 'directory_only', 'Martial Arts', 'https://johnsonsmartialartsacademy.com', '(334) 284.2344', NULL, '1751 Eastern Blvd.', 'Montgomery, AL 36116', 'Classes for ages 3 to Adults. At Johnson’s Karate & Fitness Academy we teach Tae Kwon Do, Self-Defense, Private Lessons, Fitness Kickboxing, Pilates, and Sport ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '9ec2f1b2-5618-47e2-ac4d-7c156cffc3b7';

  -- Kumon Reading & Math Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'kumon-reading-and-math-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Kumon Reading & Math Center', 'kumon-reading-and-math-center', 'directory_only', 'Tutoring', 'https://kumon.com', '(334) 649.1178', 'montgomerysoutheast_al@ikumon.com', '8115 Vaughn Rd', 'Montgomery, AL 36116', 'After-school academic enrichment program that helps children achieve success. The Kumon Math program develops necessary skills to help children progress from co', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'bba4ffff-3592-4257-b4d2-bfd2d6f4c808';

  -- Lisa’s Dance Dimensions
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'lisas-dance-dimensions';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Lisa’s Dance Dimensions', 'lisas-dance-dimensions', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://lisasdancedimensions.com', '(334) 303.7279', 'LDDNDG@aol.com', '101 Penser Blvd.', 'Millbrook, AL 36054', 'Offer Parent/Tot, Ballet, Pointe, Lyrical, Jazz, Tap, and Gymnastics. Class times vary according to age and level. Registration August 5 & 6 from 4-6 p.m. Regis', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'dd93d091-f68e-461a-997b-7f5d49482543';

  -- MANE (Montgomery Area Non-traditional Equestrian)
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'mane-montgomery-area-non-traditional-equestrian';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('MANE (Montgomery Area Non-traditional Equestrian)', 'mane-montgomery-area-non-traditional-equestrian', 'directory_only', 'Horses', 'https://maneweb.org', '(334) 213.0909', NULL, '3699 Wallhatchie Road', 'Montgomery, AL 36064', 'Applications available online. Successfully teaching independent riding skills to children with cerebral palsy, mental disabilities, autism, hearing impairment ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'bfa667e9-29f7-4014-a760-35a5401618da';

  -- Mann Dance Studio
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'mann-dance-studio';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Mann Dance Studio', 'mann-dance-studio', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://manndancestudio.net', '(334) 365.5154', NULL, '422 Pratt St.', 'Prattville, AL 36054', 'The studio offers and excels in all forms of dance, offering beginner, intermediate, and advanced classes. Registration going on now and classes start in August', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e4c98a19-d492-4611-abca-b92f605e33df';

  -- Martial Arts Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'martial-arts-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Martial Arts Center', 'martial-arts-center', 'directory_only', 'Martial Arts', NULL, '(334) 301.3722', NULL, '565 Pike Road', 'Pike Road, AL 36064', 'Martial Arts combined with discipline and etiquette. Martial Arts is good, clean fun for kids and a great way to give them a head start in life. Our primary foc', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'd2c41e11-97f4-4d4d-989a-6ca980befebe';

  -- MasterRead
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'masterread';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('MasterRead', 'masterread', 'directory_only', 'Tutoring', NULL, '(334) 271.6295', NULL, '2815-C Zelda Rd.,', 'Montgomery, AL 36106', 'Grades K-12 individual tutoring. Sessions for reading, comprehension, phonemic awareness, phonics, math, composition, spelling, study skills and ACT/SAT prepara', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '443d7478-3968-4d79-94f3-65537aae19a8';

  -- Mathnasium
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'mathnasium';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Mathnasium', 'mathnasium', 'directory_only', 'Tutoring', 'https://mathnasium.com/eastmontgomery', '(334) 239.8132', 'eastmontgomery@mathnasium.com', '3453 Malcolm Drive', 'Montgomery, AL 36116', 'We specialize in teaching kids math the way that makes sense to them. We provide: Expert tutors, Custom learning plans and personalized instruction, and Homewor', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'ab27411b-b721-4534-b9b1-5f4570edc275';

  -- Michaels
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'michaels';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Michaels', 'michaels', 'directory_only', 'Miscellaneous', 'https://michaels.com', '(334) 260.2846', NULL, 'East Chase Market Center, 7991 Eastchase Pkwy', 'Montgomery, AL 36117', 'Learn crafting skills when and where you want with online classes from Creativebug, or sign up for in store classes in jewelry making, art painting, paper craft', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '1ad0cb15-fab1-47f5-b941-bb5f1505379a';

  -- Montgomery Judo Academy
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-judo-academy';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery Judo Academy', 'montgomery-judo-academy', 'directory_only', 'Martial Arts', 'https://usja.net', '(631) 767.8052', NULL, '1555 Eastern Blvd', 'Montgomery, AL 36116', 'Your child will reach new heights when they learn judo the gentle way! Gain confidence, build character, and learn respect. Teaching kids, teens and adults. Lou', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '6f983408-3818-4b17-9005-7e74aab38ac1';

  -- Montgomery Museum of Fine Arts: Studio Programs
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-museum-of-fine-arts-studio-programs';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery Museum of Fine Arts: Studio Programs', 'montgomery-museum-of-fine-arts-studio-programs', 'directory_only', 'Art and Music', 'https://mmfa.org', '(334) 240.4365', 'bmorrison@mmfa.org', '1 Museum Drive', 'Montgomery, AL 36117', 'Drawing and painting for preschoolers, children and adults. Afternoons and on weekends. Call for class, times, and cost information. Scholarships are available.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '2940f970-cacb-494d-a763-898f7fa7d77a';

  -- Montgomery Music Project
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-music-project';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery Music Project', 'montgomery-music-project', 'directory_only', 'Art and Music', 'https://montgomerysymphony.org', '(334) 240.4004', 'montgomerymusicproject@gmail.com', '507 Columbus St.', 'Montgomery, AL 36104', 'The mission of the Montgomery Music Project (MMP) is to develop young people and bring communities together through music. We do this by delivering affordable, ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'f5f45037-a4e1-4ae1-9f0d-389837e86b2d';

  -- Montgomery Symphony Youth Orchestra
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-symphony-youth-orchestra';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery Symphony Youth Orchestra', 'montgomery-symphony-youth-orchestra', 'directory_only', 'Art and Music', 'https://montgomerysymphony.org', '(334) 414.1261', 'rdrawls@charter.net', '507 Columbus Street', 'Montgomery, AL 36104', 'Runs concurrent with the school year. Audition date will be in September. Please check our website for updates.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '72893f08-c4ed-4b39-b7f3-417823af6445';

  -- Montgomery YMCA
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-ymca';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery YMCA', 'montgomery-ymca', 'directory_only', 'Recreational & Sports', NULL, '(334) 396.9754', NULL, NULL, 'Montgomery, AL', 'Offering over 100 different programs for all ages. Including inside and outside youth and adult soccer, football (grades 1-6), basketball (year-round & all ages', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '9ef93927-ba8f-4fb4-a5e0-2780ce683807';

  -- Montgomery YMCA Goodtimes Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'montgomery-ymca-goodtimes-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Montgomery YMCA Goodtimes Center', 'montgomery-ymca-goodtimes-center', 'directory_only', 'Recreational & Sports', 'https://ymcamontgomery.org', '(334) 279.8666', NULL, '2325 Mill Ridge Dr., off Bell Road', 'Montgomery, AL 36117', 'Staffed from 2:30 to 6 p.m. After school programs are at the schools. Programs include snack and juice, homework time, music and language, storytelling time, ou', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'c6d6ab2c-4629-462e-b9c7-833797306bf1';

  -- Music Education on Wheels
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'music-education-on-wheels';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Music Education on Wheels', 'music-education-on-wheels', 'directory_only', 'Art and Music', 'https://M.E.O.W. or at our website meowacademy.com', '(334) 676.1449', 'meowforschool@gmail.com', '104 Mendel Pkwy.', 'Montgomery, AL 36117', 'M.E.O.W. is designed the positive influence of music within the education system. Group and private music lessons designed to make sure each student develops a ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'a0468332-fa8c-4585-9fc1-715a9d6743fe';

  -- Next Dimension Gymnastics
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'next-dimension-gymnastics';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Next Dimension Gymnastics', 'next-dimension-gymnastics', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://lisasdancedimensions.com', '(334) 303.7279', NULL, '101A Penser Blvd.,', 'Millbrook, AL 36054', 'Classes offered: Parent/Tot Tumbling (ages 18mths-3), Tumble Tots (ages3-5), Super Hero Gymnastics (ages 3-5 boys), Junior Olympic Gymnastics (ages 5 and up), C', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'c6af1cc4-e548-4595-90c3-52cc137f8cae';

  -- Next Level Volleyball Club
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'next-level-volleyball-club';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Next Level Volleyball Club', 'next-level-volleyball-club', 'directory_only', 'Volleyball', NULL, NULL, 'nxtlevelvolleyballclub@gmail.com', NULL, 'Montgomery, AL 36117', 'Come join us and develop yours skills essetial to the game of volleyball.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'b7426234-2efb-4129-b07f-1eb6f6af4c43';

  -- NextGen Martial Arts, Prattville
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'nextgen-martial-arts-prattville';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('NextGen Martial Arts, Prattville', 'nextgen-martial-arts-prattville', 'directory_only', 'family-service', 'https://nextgenmartialarts.com', '(334) 590-3759', NULL, '698 Old Farm Lane S', 'Prattville, AL, 36066', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '721f8877-9a88-4c48-986c-a1b8ef920053';

  -- O'Connor Tennis Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'oconnor-tennis-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('O''Connor Tennis Center', 'oconnor-tennis-center', 'directory_only', 'Tennis', 'https://oconnortenniscenter.com', '(334) 240.4884', 'bbradshaw10s@gmail.com', '500 Anderson Street', 'Montgomery, AL 36107', 'After-school Tennis Clinics offered during the school year for all ages. We follow the MPS school schedule.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'a4067816-da24-4f67-83c1-23378156a810';

  -- P�ZAZZ ART STUDIO
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'pzazz-art-studio';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('P�ZAZZ ART STUDIO', 'pzazz-art-studio', 'directory_only', 'family-service', 'pzazzart.com', '(334) 354.1975', NULL, '1812 Glynnwood Drive', 'Prattville', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '4631555f-7817-41e2-bea2-7fcd45837a2e';

  -- Pike Road Dance Academy
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'pike-road-dance-academy';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Pike Road Dance Academy', 'pike-road-dance-academy', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://pikeroaddance.com', '(334) 782.9200', 'pikeroaddance@gmail.com', '232 West Elizabeth Lane', 'Pike Road, AL 36013', 'Offering 9 levels of dance classes ranging from beginner, intermediate to advanced, and competition style (professional) instruction. These classes were develop', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'd4f32fef-74f8-4ec5-9e55-4d4b9cd2b5f8';

  -- Prattville YMCA
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'prattville-ymca';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Prattville YMCA', 'prattville-ymca', 'directory_only', 'family-service', 'https://prattvilleymca.org', '(334) 361-0268', NULL, 'Various Locations', 'Prattville, AL, 36067', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e8120911-8d8a-420b-abe6-54389c3ccc10';

  -- Read Write Learning Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'read-write-learning-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Read Write Learning Center', 'read-write-learning-center', 'directory_only', 'family-service', 'https://readwritelearningcenter.com', '(334) 328-2134', NULL, '6752 Taylor Circle', 'Montgomery, AL, 36116', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e0be7d38-5c45-467c-8755-db2d2f129ba6';

  -- Skate Zone 2000
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'skate-zone-2000';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Skate Zone 2000', 'skate-zone-2000', 'directory_only', 'Skating', NULL, '(334) 567.4434', NULL, '88 Red Eagle Pkwy.', 'Wetumpka, AL 36092', 'Birthday Parties, State of the Art Lasertag, Homeschool Days Skating and more.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '06460f92-9769-43f3-9d07-ae3b4a27f874';

  -- Snapology
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'snapology';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Snapology', 'snapology', 'directory_only', 'family-service', 'snapology.com/riverregion', '(334) 325.4679', 'riverregionsnapology.com', NULL, 'Montgomery', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '0641736b-5ddd-4043-b60e-3230b8c839ed';

  -- St. James Upward Soccer
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'st-james-upward-soccer';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('St. James Upward Soccer', 'st-james-upward-soccer', 'directory_only', 'Soccer', 'https://sjlife.com', '(334) 277.3037', 'kari@sjlife.com', '9045 Vaughn Rd.', 'Montgomery, AL 36117', 'Registration available online. K4 through 4 grade (boys and girls welcome) Registration is going on now.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e16b732f-3ff3-4e2c-abfb-716e0bf40686';

  -- Success Unlimited
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'success-unlimited';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Success Unlimited', 'success-unlimited', 'directory_only', 'Tutoring', 'https://suacademy.com', '(334) 213.0803', NULL, '2328 Fairlane Drive', 'Montgomery, AL 36106', 'Tutoring available for any subject. Tutoring provided by Christian certified teachers. Please call for rates.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '079fce31-9921-4fb0-8048-ba3954268b63';

  -- Suncho School of Music
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'suncho-school-of-music';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Suncho School of Music', 'suncho-school-of-music', 'directory_only', 'Art and Music', 'https://sunchomusic.com', '(334) 625.0306', 'sunchomusic@gmail.com', NULL, 'Wetumpka, AL 36093', 'Learn to play the music that you love to listen to! We provide excellent private lessons in guitar, piano, singing, drums, and ukulele. We teach kids, teens, an', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '04f362ac-22a3-47f1-9676-cc4a4ec484f7';

  -- Swim Prep
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'swim-prep';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Swim Prep', 'swim-prep', 'directory_only', 'Swimming & Scuba', 'https://swimprepllc.com', '(334) 356.6116', 'rebecca@swimprepllc.com', '2212 Howard Murfee Blvd.', 'Prattville, AL 36066', 'Private One-o-one swim lessons starting at 6 months. Maintenance and group classes offered after student has graduated our program. Please visit our website for', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'cb95b40e-5a5c-414b-a0ca-ca4a90f431e8';

  -- Sylvan Learning of Prattville
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'sylvan-learning-of-prattville';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Sylvan Learning of Prattville', 'sylvan-learning-of-prattville', 'directory_only', 'Tutoring', 'https://sylvanlearning.com/Prattville', '(334) 380.4144', NULL, '2046 Farivew Ave.', 'Prattville, AL 36066', 'Sylvan offers tutoring and individualized test prep for all math, reading, writing and more. We offer ACT/SAT Test prep. Monthly packages are available for Acad', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '25ad09ca-1364-4381-91b4-3d9e06b742b3';

  -- Taekwondo Mojo
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'taekwondo-mojo';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Taekwondo Mojo', 'taekwondo-mojo', 'directory_only', 'Martial Arts', 'https://taekwondomojo.com', '(334) 462.4758', NULL, '7919 Vaughn Road', 'Montgomery, AL 36117', 'We are dedicated to providing a supportive and empowering environment for individuals of all ages to learn and grow through the practice of Taekwondo. Please ca', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'd92e8d2d-73f3-4f25-a2a6-c6a5c9096364';

  -- Tammy's Academy of Dance
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'tammys-academy-of-dance';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Tammy''s Academy of Dance', 'tammys-academy-of-dance', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://tammysacademyofdance.net', '(334) 221.2657', 'info@tammysacademyofdance.net', '742 U.S. Hwy 231', 'Wetumpka, AL 36092', 'Registration going on now. Ballet, Tap, Jazz, Pointe and Contemporary and Tumbling. Classes for ages 3 through adult.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'bdd58a92-ab09-42e9-9112-a31d03daa9d7';

  -- The Montgomery Ballet
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'the-montgomery-ballet';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('The Montgomery Ballet', 'the-montgomery-ballet', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://montgomeryballet.org', '(334) 721.3687', 'info@montgomeryballet.org', '440 Coliseum Blvd.', 'Montgomery, AL 36109', 'The Montgomery Ballet is the producer of Performance on the Green, Ballet and the Beasts and The Nutcracker. Training provided in Classical Ballet for children ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '3e3572e5-8440-419f-b77e-26f542ac23fe';

  -- Therapeutic Recreation Center
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'therapeutic-recreation-center';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Therapeutic Recreation Center', 'therapeutic-recreation-center', 'directory_only', 'Recreational & Sports', 'https://montgomeryal.gov', '(334) 240.4595', NULL, '604 Augusta Street', 'Montgomery, AL 36111', 'For the mentally and physically challenged. Various programs available. Classes run from 4 p.m. – 5 p.m. Monday thru Friday. Transportation is provided for Mont', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e73b6a85-5714-4886-8e84-d59b97fad2b9';

  -- Tiger Park TKD
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'tiger-park-tkd';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Tiger Park TKD', 'tiger-park-tkd', 'directory_only', 'Martial Arts', 'https://tigerparktkd.com', '(334) 277.2627', NULL, '3125 Bell Road', 'Montgomery, AL 36116', 'Classes for everyone Ages 3 to adult. We now offer an After-school Program. We provide free transportation from your child''s school to our facility. Our program', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '9d77a35e-62ea-4c79-b7a0-3d5b914af689';

  -- Tonya Speed's Dance Connection
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'tonya-speed-s-dance-connection';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Tonya Speed''s Dance Connection', 'tonya-speed-s-dance-connection', 'directory_only', 'family-service', 'Facebook: Tonya-Speeds-Dance-Connection', '(334) 549-1098', NULL, '3370 Harrison Rd', 'Montgomery, AL, 36109', NULL, true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'fc7531e0-41a0-4701-9254-8ea1305982c4';

  -- Tutu School
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'tutu-school';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Tutu School', 'tutu-school', 'directory_only', 'Dance, Gymnastics & Cheer', NULL, '(334) 363.3360', NULL, '2690G Zelda Road', 'Montgomery, AL 36106', 'Tutu School is a whimsical storybook ballet school for children 18 months to 8 years old offering classes, parties, and camps. Registration is on going. Please ', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '7235a147-58fc-43ef-ad3b-d0e43d2ccb76';

  -- United Gym Stars & Cheer, L.L.C.
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'united-gym-stars-and-cheer-l-l-c';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('United Gym Stars & Cheer, L.L.C.', 'united-gym-stars-and-cheer-l-l-c', 'directory_only', 'Dance, Gymnastics & Cheer', 'https://unitedgymstarsandcheer.com', '(334) 284.2244', NULL, '6100 Brewbaker Blvd.', 'Montgomery, AL 36116', 'Offer Baby gym for ages 1&2, Kinder Gym for girls ages 3-4, Boys’ Preschool for boys ages 3-5, Junior Gym ages 5 & 6 yrs., Boys’ Progressive ages 6 and up, Girl', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '9bd5c632-7dcf-4297-a15b-92b665f83875';

  -- US Yoshukai Karate
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'us-yoshukai-karate';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('US Yoshukai Karate', 'us-yoshukai-karate', 'directory_only', 'Martial Arts', 'https://usyka.com', '(334) 657.2032', 'usyka1997@gmail.com', '290 N. Burbank Dr.', 'Montgomery, AL 36117', 'Visit us on Facebook under US Yoshukai Karate for more details and classes offered. Ages 5 and up.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '6f2588e9-8187-4b44-b9df-445214e10d38';

  -- Wetumpka Depot Players
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'wetumpka-depot-players';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Wetumpka Depot Players', 'wetumpka-depot-players', 'directory_only', 'Drama Classes & Public Speaking', 'https://wetumpkadepot.com', '(334) 868.1440', 'kmeanor@wetumpkadepot.com', '300 South Main Street', 'Wetumpka, AL 36092', 'Fall Afterschool Sessions and Homeschool sessions available. Please email to be contacted when those programs are finalized.', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '2e0c7da3-d15e-40c1-9e36-f8129b3ead9d';

  -- Wetumpka YMCA
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'wetumpka-ymca';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Wetumpka YMCA', 'wetumpka-ymca', 'directory_only', 'Recreational & Sports', 'https://ymcamontgomery.org', '(334) 567.8282', NULL, '200 Red Eagle Drive', 'Wetumpka, AL 36092', 'YMCA Goodtimes after hours for school age children (5 to 11 yrs.) pick up and keep them until 6 p.m. Have several programs, including: Summer Camp, Youth Sports', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = '13751091-655c-48ed-85e2-56ed038e2a6e';

  -- Wynlakes Tennis
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'wynlakes-tennis';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('Wynlakes Tennis', 'wynlakes-tennis', 'directory_only', 'Tennis', 'https://wynlakes.com', '(334) 273.8425', 'dleal@mindspring.com', '7900 Wynlakes Blvd.', 'Montgomery, AL 36117', 'The Wynlakes Junior Tennis Program offers classes for students 4 years and older. Beginning with “Pee Wee Tennis” the players graduate to “Rising Stars” and mov', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'f840807f-d71d-4075-9c2f-99fb5b89c5f0';

  -- YMCA Barracuda’s Competitive Swim Team
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'ymca-barracudas-competitive-swim-team';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('YMCA Barracuda’s Competitive Swim Team', 'ymca-barracudas-competitive-swim-team', 'directory_only', 'Swimming & Scuba', 'https://ymcamontgomery.org', '(334) 272.3390', 'rklages@ymcamontgomery.org', '3407 Pelzer Avenue', 'Montgomery, AL 36109', 'The YMCA has a year-round competitive swim program based at the East YMCA. Please call (334) 272.3390. Tryouts will be held in August. Please call for more info', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'e45fd844-8de0-4ef6-95ed-08ffefc4bece';

  -- YMCA Capital City Streaks
  SELECT id INTO v_acct FROM advertiser_accounts WHERE slug = 'ymca-capital-city-streaks';
  IF v_acct IS NULL THEN
    INSERT INTO advertiser_accounts (business_name, slug, kind, category, website_url, office_phone, contact_email, address, city_state_zip, card_hook, is_active)
    VALUES ('YMCA Capital City Streaks', 'ymca-capital-city-streaks', 'directory_only', 'Soccer', 'https://capitalcitystreaks.org', '(334) 218.3750', 'msanchez@capitalcitystreaks.or', '300 Brown Springs Road', 'Montgomery, AL 36117', 'Participants can sign up at any local YMCA. Season- September-November and April-May. Ages 6-18. Games: Mondays, Tuesdays, Thursdays, Fridays and Saturdays. Reg', true)
    RETURNING id INTO v_acct;
  END IF;
  UPDATE guide_listings SET advertiser_account_id = v_acct, updated_at = NOW() WHERE id = 'f6b9379b-c172-4f9a-9a04-8a2a69668739';

END $$;

COMMIT;

-- Verify:
--   SELECT COUNT(*) FILTER (WHERE advertiser_account_id IS NOT NULL) AS linked,
--          COUNT(*) AS total
--     FROM guide_listings
--    WHERE guide_type_slug = 'afterschool' AND listing_year = 2026 AND is_published;
--   -- expect linked = total = 80
