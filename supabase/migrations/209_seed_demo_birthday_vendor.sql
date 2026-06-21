-- 209_seed_demo_birthday_vendor.sql
--
-- Seeds a fully-populated demo Birthday vendor so the editor can see
-- every section of the new schema-driven ListingDetailPage rendered
-- with real-looking data. Visible at:
--   /birthday-party-guide/listings/confetti-cove-party-studio
--
-- Also adds gallery_image_urls TEXT[] to advertiser_accounts — the
-- canonical ListingDetailPage has been reading from this column for
-- months but it was never actually created (gallery only ever existed
-- on guide_listings). Adding it here so the gallery section finally
-- works site-wide, not just for the demo.
--
-- Idempotent — only inserts if the row doesn't already exist; safe to
-- re-run. To wipe + re-seed, DELETE the advertiser_accounts row first
-- (ON DELETE CASCADE clears guide_listings + listing_sections).

-- Latent-bug fixes — both columns are read by existing components but
-- were never created. Safe on re-runs.
--   advertiser_accounts.gallery_image_urls — ListingDetailPage reads
--     it for the Gallery section but it only ever lived on
--     guide_listings (per migration 012).
--   listing_sections.offer_cta_url — SpecialOfferSection renders a
--     CTA button when this is set, but only offer_cta_label was ever
--     added to the schema.
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS gallery_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE listing_sections
  ADD COLUMN IF NOT EXISTS offer_cta_url TEXT;

DO $$
DECLARE
  v_acct_id UUID;
BEGIN
  -- Skip cleanly if it's already seeded
  IF EXISTS (SELECT 1 FROM advertiser_accounts WHERE slug = 'confetti-cove-party-studio') THEN
    RAISE NOTICE 'Demo birthday vendor already seeded; skipping.';
    RETURN;
  END IF;

  -- ── Advertiser account ─────────────────────────────────────────
  INSERT INTO advertiser_accounts (
    business_name, slug, contact_name, contact_email, contact_phone,
    office_phone, website_url, address, city_state_zip, neighborhood,
    card_hook, detail_lead, hero_photo_url, gallery_image_urls,
    has_military_discount, is_veteran_owned, is_woman_owned,
    is_minority_owned, is_locally_owned, is_active
  ) VALUES (
    'Confetti Cove Party Studio',
    'confetti-cove-party-studio',
    'Sarah Cove',
    'hello@confetticove.example',
    '(334) 555-0142',
    '(334) 555-0142',
    'https://confetticove.example',
    '500 Festival Way',
    'Montgomery, AL 36117',
    'Eastdale',
    'All-inclusive themed birthday parties with a dedicated party host — you bring the kid, we bring the magic.',
    'Confetti Cove is the River Region''s most-booked all-inclusive party studio. We handle every detail so parents can actually enjoy the celebration: themed decor, hosted activities, food, cake setup, photo backdrops, and a deep-clean before AND after. Eight themed rooms, parties for ages 2 through 12, and the most patient party hosts in town.',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1600&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1464347744102-11db6282f854?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80'
    ],
    TRUE,  -- military discount
    FALSE,
    TRUE,  -- woman-owned
    FALSE,
    TRUE,  -- locally-owned
    TRUE
  ) RETURNING id INTO v_acct_id;

  -- ── Guide listing — birthday-party with headline facts ─────────
  INSERT INTO guide_listings (
    advertiser_account_id, guide_type_slug, category, listing_tier,
    listing_year, is_published, display_order,
    business_name, office_phone, contact_email, website_url,
    address, city_state_zip, neighborhood, hero_photo_url, card_hook,
    guide_data
  ) VALUES (
    v_acct_id,
    'birthday-party',
    'Places to Party - Artistic',
    'tier-1-featured-listing',
    2026,
    TRUE,
    0,
    'Confetti Cove Party Studio',
    '(334) 555-0142',
    'hello@confetticove.example',
    'https://confetticove.example',
    '500 Festival Way',
    'Montgomery, AL 36117',
    'Eastdale',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1600&q=80',
    'All-inclusive themed birthday parties — we bring the magic.',
    jsonb_build_object(
      'ages',           '2 – 12',
      'capacity',       'Up to 20 children',
      'price_range',    '$295 – $695',
      'party_duration', '2 hours',
      'description',    'Confetti Cove is the River Region''s most-booked all-inclusive party studio.'
    )
  );

  -- ── Structured sections — every section type in the birthday schema ──

  -- 1. Our Story
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, body_content) VALUES
  (v_acct_id, 'our_story', TRUE, 10, 'About Confetti Cove',
   'Confetti Cove opened in 2019 when founder Sarah Cove threw her daughter''s 5th birthday in a rented gym and realized River Region parents needed a true all-inclusive party option. Today we host 400+ parties a year across eight themed rooms — every one staffed by trained hosts who handle setup, activities, food, and cleanup so parents can be guests at their own kid''s party.');

  -- 2. Party Packages
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, subheadline, items) VALUES
  (v_acct_id, 'party_packages', TRUE, 20, 'Party Packages',
   'Every package includes setup, hosting, food, cake plating, and post-party cleanup.',
   jsonb_build_array(
     jsonb_build_object(
       'name', 'The Sprinkle',
       'price', '$295',
       'duration', '90 min · up to 12 kids',
       'includes', jsonb_build_array('Choice of 1 theme room','Dedicated party host','Themed plates + cups + napkins','Pizza, fruit + juice for 12','Cake plating + serving','Setup + cleanup')
     ),
     jsonb_build_object(
       'name', 'The Confetti',
       'price', '$495',
       'duration', '2 hours · up to 16 kids',
       'featured', true,
       'includes', jsonb_build_array('Choice of 2 theme rooms','2 dedicated party hosts','Full themed tablescape','Pizza + 2 sides + drinks for 16','Goody bags for every guest','Cake plating + serving','Photo backdrop + props','Setup + cleanup')
     ),
     jsonb_build_object(
       'name', 'The Cove',
       'price', '$695',
       'duration', '2.5 hours · up to 20 kids',
       'includes', jsonb_build_array('Whole studio buyout','3 dedicated party hosts','Premium themed decor','Catered hot food + drinks for 20','Premium goody bags','Custom cake from local baker','Photo backdrop + props','Adult lounge + coffee bar','Setup + cleanup'),
       'note', 'Whole-studio buyout — no other parties booked during your slot.'
     )
   ));

  -- 3. What's Different
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, body_content) VALUES
  (v_acct_id, 'whats_different', TRUE, 30, 'What Makes Us Different',
   'We''re the only fully-staffed party studio in the River Region. Other venues hand you the keys; we hand you a glass of wine and run the party. Parents who book once book again — 60% of our 2026 calendar is repeat families.');

  -- 4. Features Bullets (What's Included)
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, bullet_points) VALUES
  (v_acct_id, 'features_bullets', TRUE, 40, 'What''s Included in Every Party',
   jsonb_build_array(
     'Trained party host(s) for the full event',
     'Setup AND cleanup — you arrive to a ready room',
     'All themed decor, plates, cups, napkins',
     'Pizza + drinks for every package',
     'Cake plating, candle lighting, serving',
     'Photo backdrop with theme-matched props',
     'Allergy-aware menu options on request'
   ));

  -- 5. Themes Available
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, subheadline, bullet_points) VALUES
  (v_acct_id, 'themes_available', TRUE, 50, 'Themes Available',
   'Eight ready-to-go themes plus custom themes by request (4 weeks notice).',
   jsonb_build_array(
     'Princess Tea Party',
     'Superhero Academy',
     'Dinosaur Dig',
     'Mermaid Lagoon',
     'Outer Space',
     'Construction Zone',
     'Unicorn Garden',
     'Pirate Adventure',
     'Custom (by request)'
   ));

  -- 6. Add-Ons
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, subheadline, items) VALUES
  (v_acct_id, 'party_addons', TRUE, 60, 'Add-On Options',
   'Stack any of these onto any package.',
   jsonb_build_array(
     jsonb_build_object('name', 'Face painting (1 hr)', 'price', '+$85'),
     jsonb_build_object('name', 'Balloon artist (1 hr)', 'price', '+$95'),
     jsonb_build_object('name', 'Custom cake from Sweet Bee Bakery', 'price', '+$60-$140'),
     jsonb_build_object('name', 'Professional party photographer (1 hr)', 'price', '+$175'),
     jsonb_build_object('name', 'Extra 30 minutes', 'price', '+$75'),
     jsonb_build_object('name', 'Premium goody bag upgrade', 'price', '+$8/child')
   ));

  -- 7. Party Hours
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, items, body_content) VALUES
  (v_acct_id, 'party_hours', TRUE, 70, 'Party Hours',
   jsonb_build_array(
     jsonb_build_object('day', 'Sunday',    'open', '11:00 AM', 'close', '6:00 PM'),
     jsonb_build_object('day', 'Monday',    'closed', true),
     jsonb_build_object('day', 'Tuesday',   'open', '4:00 PM', 'close', '8:00 PM'),
     jsonb_build_object('day', 'Wednesday', 'open', '4:00 PM', 'close', '8:00 PM'),
     jsonb_build_object('day', 'Thursday',  'open', '4:00 PM', 'close', '8:00 PM'),
     jsonb_build_object('day', 'Friday',    'open', '4:00 PM', 'close', '9:00 PM'),
     jsonb_build_object('day', 'Saturday',  'open', '10:00 AM', 'close', '9:00 PM')
   ),
   'Most parties book 2 – 6 weeks out. Saturday afternoons fill up first.');

  -- 8. Best For
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, bullet_points) VALUES
  (v_acct_id, 'best_for', TRUE, 80, 'Best For',
   jsonb_build_array(
     'Parents who want to actually enjoy the party',
     'Ages 2 – 12',
     'Indoor weather backup',
     'Themed birthday parties',
     'Co-ed groups',
     'Allergy-aware families'
   ));

  -- 9. Parents Say
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, items) VALUES
  (v_acct_id, 'parents_say', TRUE, 90, 'Parents Say',
   jsonb_build_array(
     jsonb_build_object('quote', 'We''ve booked Confetti Cove three years running. Sarah''s team is the only reason I''ve enjoyed any of my kids'' birthday parties.', 'name', 'Megan T.', 'detail', 'Mom of 3 — Prattville'),
     jsonb_build_object('quote', 'Drop the kid, drink the coffee, take the photos. That''s the whole experience.', 'name', 'Jess R.', 'detail', 'Mom — Montgomery'),
     jsonb_build_object('quote', 'My daughter''s allergy was handled without a single question. They''d already thought of it.', 'name', 'David K.', 'detail', 'Dad — Wetumpka')
   ));

  -- 10. FAQ
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, faqs) VALUES
  (v_acct_id, 'faq', TRUE, 100, 'Frequently Asked',
   jsonb_build_array(
     jsonb_build_object('question', 'How far in advance should we book?',         'answer', 'For Saturdays, 4 – 8 weeks out. Weekday + Sunday slots usually open 2 weeks ahead.'),
     jsonb_build_object('question', 'Can we bring our own cake?',                  'answer', 'Yes — bring any cake; we handle plating, candles, and serving at no extra charge.'),
     jsonb_build_object('question', 'What''s the deposit?',                         'answer', '$100 non-refundable deposit reserves your date. Balance due 48 hrs before the party.'),
     jsonb_build_object('question', 'Do siblings count toward the guest cap?',     'answer', 'Yes, every kid eating/playing counts. Adults are unlimited.'),
     jsonb_build_object('question', 'Allergy accommodations?',                     'answer', 'Standard. Tell us at booking; we keep a separate prep station for nut, dairy, and gluten allergies.')
   ));

  -- 11. Booking Notes
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, body_content, bullet_points) VALUES
  (v_acct_id, 'booking_notes', TRUE, 110, 'Booking & Policies',
   'Deposits are non-refundable but transferable to a future date with 14 days'' notice.',
   jsonb_build_array(
     '$100 deposit reserves the date',
     'Balance due 48 hours before',
     'Cancellation with 14 days notice → reschedule, no refund',
     'Late cancellation forfeits the deposit',
     'Custom themes need 4 weeks lead time'
   ));

  -- 12. Health & Safety
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, body_content, bullet_points) VALUES
  (v_acct_id, 'health_safety', TRUE, 120, 'Health & Safety',
   'Every host is CPR + first-aid certified, background-checked, and trained on our allergy protocol. Studio is deep-cleaned between every party.',
   jsonb_build_array(
     'All hosts CPR + first-aid certified',
     'Background checks on every staff member',
     'Separate allergy-safe prep station',
     'Deep clean between every party',
     '$2M general liability insurance'
   ));

  -- 13. Special Offer
  INSERT INTO listing_sections (advertiser_account_id, section_type, is_active, display_order, headline, offer_text, offer_cta_label, offer_cta_url) VALUES
  (v_acct_id, 'special_offer', TRUE, 130, 'Special Offer for River Region Parents',
   'Mention River Region Parents at booking and we''ll add face painting to any package, free ($85 value).',
   'Book a Tour', 'https://confetticove.example/tour');

  RAISE NOTICE 'Demo birthday vendor seeded: /birthday-party-guide/listings/confetti-cove-party-studio';
END$$;
