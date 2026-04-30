-- ============================================================
-- River Region Family Resource Guide — 2026 Demo Seed Data
-- Run AFTER migration 012_family_guide_content.sql
-- All INSERT statements use ON CONFLICT DO NOTHING for idempotency
-- ============================================================

-- Helper: grab RRP publication ID
-- All rows use guide_slug='newcomer-guide'

-- ── CATEGORIES ───────────────────────────────────────────────────────────────

INSERT INTO guide_categories (guide_slug, publication_id, slug, name, description, display_order, icon_name, show_in_print) VALUES
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'local-government', 'Local Government & Civic', 'City halls, county offices, libraries, and voter registration — the civic backbone every family needs on day one.', 1, 'Building2', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'public-schools', 'Public Schools', 'Montgomery, Autauga, Elmore, and Pike Road school districts — enrollment contacts, boundaries, and what families say.', 2, 'GraduationCap', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'private-schools', 'Private & Faith-Based Schools', 'Independent and faith-based schools serving kindergarten through 12th grade in the River Region.', 3, 'BookOpen', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'childcare', 'Childcare, Daycare & Preschool', 'Full-day daycare, Mother''s Day Out programs, Montessori, and faith-based preschools for children under 5.', 4, 'Baby', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'hospitals', 'Healthcare & Hospitals', 'Hospital systems, emergency rooms, and primary care — organized by location for quick reference.', 5, 'Hospital', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'pediatricians', 'Pediatricians', 'General pediatric practices across the River Region. Vaccine schedules don''t pause because you moved — establish care early.', 6, 'Stethoscope', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'womens-health', 'OBGYNs & Women''s Health', 'Obstetrics, gynecology, and women''s healthcare serving River Region families.', 7, 'Heart', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'dental-ortho', 'Dentists, Pediatric Dentists & Orthodontists', 'Pediatric dentistry, family dental care, and orthodontic practices.', 8, 'Smile', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'urgent-care', 'Urgent Care & After-Hours', 'When it can''t wait until Monday. Walk-in clinics and urgent care by neighborhood.', 9, 'AlertCircle', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'worship', 'Worship & Faith Communities', 'Catholic, Protestant, Jewish, and other faith communities — with notes on family programs and children''s ministry.', 10, 'Church', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'tutoring', 'Tutoring & Learning Centers', 'Academic support, test prep, reading specialists, and enrichment programs for River Region students.', 11, 'Pencil', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'sports-activities', 'Sports & Activities', 'Youth leagues, gymnastics, martial arts, swim teams, and competitive programs by age and season.', 12, 'Trophy', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'family-activities', 'Family Activities & Things to Do', 'The zoo, museums, parks, splash pads, and day trips that make River Region childhood memorable.', 13, 'MapPin', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'restaurants', 'Restaurants', 'Family-friendly dining from weeknight staples to special-occasion restaurants — organized by neighborhood.', 14, 'UtensilsCrossed', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'farmers-markets', 'Farmer''s Markets & Local Food', 'Fresh produce, local vendors, and farm stands where River Region families shop.', 15, 'ShoppingBasket', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'real-estate', 'Real Estate — Family Relocation', 'Agents who specialize in relocating families and know which neighborhoods and school zones fit which families best.', 16, 'Home', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'photographers', 'Family Photographers', 'Portrait studios and outdoor photographers capturing River Region families — many offer newcomer "we just moved here" sessions.', 17, 'Camera', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'media', 'Local Media & Newspapers', 'Local publications, news stations, and community media that keep River Region families informed.', 18, 'Newspaper', true),
('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), 'venues', 'Wedding & Reception Venues', 'Event venues, banquet halls, and outdoor spaces for celebrations of every size.', 19, 'Star', true)
ON CONFLICT (guide_slug, publication_id, slug) DO NOTHING;

-- ── LISTINGS ─────────────────────────────────────────────────────────────────
-- Tiers: 10% featured, 30% enhanced, 60% free
-- featured = gold border, editorial blurb, accepting_new_patients badge
-- enhanced = description, displayed above free
-- free = name, phone, website, 1-line description

-- LOCAL GOVERNMENT & CIVIC
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, listing_tier, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='local-government'), 'city-of-montgomery', 'City of Montgomery — Mayor''s Office', '103 N Perry St', 'Montgomery', '36104', '(334) 625-2000', 'www.montgomeryal.gov', 'City government, public services, permits, and community programs for Montgomery residents.', 'free', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='local-government'), 'montgomery-county-commission', 'Montgomery County Commission', '100 S Lawrence St', 'Montgomery', '36104', '(334) 832-4960', 'www.montgomerycountyalabama.gov', 'County government services, road maintenance, and unincorporated area services.', 'free', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='local-government'), 'montgomery-city-county-library', 'Montgomery City-County Public Library', '245 High St', 'Montgomery', '36104', '(334) 240-4999', 'www.mccpl.lib.al.us', 'Nine branch locations, children''s programming, homework help, and free library cards for all residents.', 'enhanced', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='local-government'), 'autauga-county-probate', 'Autauga County Probate Office — Voter Reg', '134 N Court St', 'Prattville', '36067', '(334) 361-3725', 'www.autaugaco.org', 'Voter registration, driver''s license updates, and county records for Prattville-area residents.', 'free', 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='local-government'), 'prattville-parks-rec', 'Prattville Parks & Recreation', '131 W Main St', 'Prattville', '36067', '(334) 595-0850', 'www.cityofprattville.com', 'Youth sports leagues, community pool, parks, and recreation programs for Prattville families.', 'free', 5)
ON CONFLICT (slug) DO NOTHING;

-- PUBLIC SCHOOLS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, accepting_new_patients, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='public-schools'), 'montgomery-public-schools', 'Montgomery Public Schools District', '307 S Decatur St', 'Montgomery', '36104', '(334) 223-6700', 'www.mps.k12.al.us', 'One of Alabama''s largest public school districts, serving 28,000+ students across 55+ schools in the Montgomery metro.', 'MPS serves pre-K through 12th grade with magnet programs, career academies, and dual-enrollment options. Open enrollment information is available at Central Office — call or visit to confirm your child''s zoned school by address.', 'featured', null, 'Central Office: Mon-Fri 8am-4:30pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='public-schools'), 'autauga-county-schools', 'Autauga County Schools', '153 W 4th St', 'Prattville', '36067', '(334) 365-5706', 'www.autaugacountyschools.com', 'Serving Prattville, Billingsley, and Autauga County with 13 schools — consistently high graduation rates and strong athletic programs.', 'Autauga County Schools consistently ranks among Alabama''s top-performing rural districts. The district offers full-day kindergarten and a growing dual-enrollment program with Trenholm State.', 'enhanced', null, null, 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='public-schools'), 'elmore-county-schools', 'Elmore County Schools', '70 Hwy 143', 'Wetumpka', '36092', '(334) 567-1200', 'www.elmoreco.com', 'Serving Wetumpka, Millbrook, Tallassee, and surrounding Elmore County communities.', 'Elmore County''s Millbrook and Wetumpka schools are popular with families who want suburban community feel with strong extracurriculars. Millbrook High''s football and Wetumpka High''s drama programs both have loyal followings.', 'enhanced', null, null, 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='public-schools'), 'pike-road-schools', 'Pike Road Schools', '9775 Marler Rd', 'Pike Road', '36064', '(334) 215-4411', 'www.pikeroadschools.com', 'A small, fast-growing district in one of Montgomery''s most sought-after family neighborhoods.', 'Pike Road is one of the most talked-about school options in the River Region. Small class sizes, newer facilities, and a community-minded culture. Enrollment opens in the spring — waitlists can form for some grade levels.', 'featured', null, 'District Office: Mon-Fri 7:30am-4pm', 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='public-schools'), 'montgomery-magnet-schools', 'Montgomery Magnet Schools Office', '307 S Decatur St', 'Montgomery', '36104', '(334) 223-6764', 'www.mps.k12.al.us', 'Specialized programs in STEM, performing arts, visual arts, and international studies — open to students across MPS by application.', 'Magnet School', 'free', null, null, 5)
ON CONFLICT (slug) DO NOTHING;

-- PRIVATE & FAITH-BASED SCHOOLS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'saint-james-school', 'Saint James School', '6010 Vaughn Rd', 'Montgomery', '36116', '(334) 277-8054', 'www.saintjamesschool.net', 'PK3 through 12th grade, consistently ranked among Alabama''s top independent schools. NCAA Division I athletic program.', '"We chose Saint James because of the culture — every teacher knows your child''s name on the first day." — River Region parent, class of 2025.', 'featured', 'Mon-Fri 7:30am-3:30pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'trinity-presbyterian', 'Trinity Presbyterian School', '4700 Narrow Lane Rd', 'Montgomery', '36116', '(334) 272-5900', 'www.trinityschoolmontgomery.com', 'Classical Christian education from 3K through 12th grade. Known for academic rigor and a strong community of engaged families.', 'Trinity''s classical model, Socratic seminars, and Latin program attract families looking for something different from the standard curriculum. Inquire early — enrollment can fill.', 'enhanced', 'Mon-Fri 8am-3pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'montgomery-catholic', 'Montgomery Catholic Preparatory School', '5350 Vaughn Rd', 'Montgomery', '36116', '(334) 272-6044', 'www.montgomerycatholic.org', 'Catholic pre-K through 12th grade. Strong college-prep academics, competitive athletics, and a faith-integrated curriculum.', null, 'free', null, 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'macon-east-academy', 'Macon East Academy', '300 Warrior Way', 'Cecil', '36013', '(334) 738-4000', 'www.maconeastacademy.com', 'K-12 independent school in Cecil serving families from eastern Montgomery and surrounding counties.', null, 'free', null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'alabama-christian-academy', 'Alabama Christian Academy', '5412 Wares Ferry Rd', 'Montgomery', '36109', '(334) 272-3443', 'www.alabamachristian.org', 'Christian K-12 education with emphasis on biblical integration, college preparation, and character development.', null, 'free', null, 5),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='private-schools'), 'evangel-christian-school', 'Evangel Christian School', '7655 Vaughn Rd', 'Montgomery', '36116', '(334) 272-8622', 'www.evangelchristian.org', 'Spirit-filled Christian education, pre-K through 12th grade. Active parent community and thriving arts programs.', null, 'free', null, 6)
ON CONFLICT (slug) DO NOTHING;

-- CHILDCARE, DAYCARE & PRESCHOOL
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, accepting_new_patients, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='childcare'), 'bright-horizons-montgomery', 'Bright Horizons at Eastchase', '7911 Vaughn Rd', 'Montgomery', '36116', '(334) 271-9990', 'www.brighthorizons.com', 'National provider offering full-day infant, toddler, preschool, and pre-K programs with consistent curriculum standards.', '"The teachers genuinely love these kids. My daughter cried her first day and was running back in by day three." — RRP parent review.', 'featured', true, 'Mon-Fri 6:30am-6pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='childcare'), 'first-united-mdo', 'First United Methodist Church — Mother''s Day Out', '2416 W Fairview Ave', 'Montgomery', '36108', '(334) 834-7551', 'www.firstumcmontgomery.org', 'Twice-weekly Mother''s Day Out program for ages 6 months to 4 years. Play-based, faith-affirming, nurturing environment.', 'A beloved River Region institution for families with young children. Enrollment opens in January for fall — spots fill fast. Church membership not required.', 'enhanced', null, 'Tue-Thu 9am-1pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='childcare'), 'eastchase-learning-academy', 'Eastchase Learning Academy', '7951 Vaughn Rd', 'Montgomery', '36117', '(334) 270-0072', 'www.eastchasela.com', 'Preschool and after-school care in the Eastchase corridor. Licensed, full-day and half-day options available.', null, 'enhanced', null, 'Mon-Fri 7am-5:30pm', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='childcare'), 'montessori-of-montgomery', 'Montessori Academy of Montgomery', '3920 Atlanta Hwy', 'Montgomery', '36109', '(334) 272-8580', 'www.montessorimontgomery.com', 'Authentic Montessori education for ages 18 months to 12 years. AMI-aligned approach, mixed-age classrooms, Spanish instruction.', null, 'free', null, null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='childcare'), 'kids-r-kids-prattville', 'Kids ''R'' Kids — Prattville', '650 McQueen Smith Rd', 'Prattville', '36066', '(334) 365-5437', 'www.kidsrkids.com', 'Nationally recognized childcare center offering full-day infant through pre-K programs in the Prattville area.', null, 'free', null, 'Mon-Fri 6am-6pm', 5)
ON CONFLICT (slug) DO NOTHING;

-- HOSPITALS & HEALTHCARE
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='hospitals'), 'baptist-medical-east', 'Baptist Medical Center East', '400 Taylor Rd', 'Montgomery', '36117', '(334) 277-8330', 'www.baptisthealth.org', 'Full-service hospital in east Montgomery with Level II emergency department, labor and delivery, and specialty services.', 'Baptist East is the preferred hospital for many River Region families due to its location in Eastchase and its well-regarded labor and delivery unit. NICU on-site.', 'featured', '24/7 Emergency', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='hospitals'), 'jackson-hospital', 'Jackson Hospital', '1725 Pine St', 'Montgomery', '36106', '(334) 293-8000', 'www.jackson.org', 'Full-service regional hospital in midtown Montgomery with comprehensive emergency, surgical, and specialty services.', null, 'free', '24/7 Emergency', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='hospitals'), 'prattville-baptist', 'Prattville Baptist Hospital', '124 S Memorial Dr', 'Prattville', '36067', '(334) 365-0651', 'www.baptisthealth.org', 'Community hospital serving Prattville and Autauga County with emergency services and outpatient specialty care.', null, 'free', '24/7 Emergency', 3)
ON CONFLICT (slug) DO NOTHING;

-- PEDIATRICIANS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, accepting_new_patients, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='pediatricians'), 'partners-in-pediatrics', 'Partners in Pediatrics', '7910 Vaughn Rd, Suite A', 'Montgomery', '36116', '(334) 270-0020', 'www.partnersinpediatrics.com', 'One of the River Region''s largest pediatric practices, serving newborns through age 21. Same-day sick visits available.', '"They treated my daughter since she was three days old and now see all three of my kids. The nurses remember everything." — River Region Parents advertiser family.', 'featured', true, 'Mon-Fri 8am-5pm, Sat 8am-12pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='pediatricians'), 'pediatric-healthcare-assoc', 'Pediatric Healthcare Associates', '4142 Carmichael Rd', 'Montgomery', '36106', '(334) 272-1500', 'www.phassociates.com', 'General pediatrics from birth through young adulthood with evening and weekend sick visit availability.', '"I switched pediatricians when we moved and couldn''t be happier. They got my son in the same day I called — that matters more than anything." — RRP parent.', 'featured', true, 'Mon-Fri 8am-6pm, Sat 9am-1pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='pediatricians'), 'professional-pediatrics', 'Professional Pediatrics', '1600 E University Dr, Suite 100', 'Auburn', '36830', '(334) 821-8290', 'www.profpeds.com', 'Serving Auburn-Opelika and surrounding areas — primary care from newborn through 21 years.', null, 'enhanced', true, 'Mon-Fri 8am-5pm', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='pediatricians'), 'prattville-pediatrics', 'Prattville Pediatrics', '225 McQueen Smith Rd, Suite 100', 'Prattville', '36066', '(334) 358-0700', null, 'Pediatric primary care serving Prattville, Millbrook, and northern Autauga County families.', null, 'free', null, null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='pediatricians'), 'midtown-pediatrics', 'Midtown Pediatrics', '550 S Lawrence St', 'Montgomery', '36104', '(334) 262-5437', null, 'Pediatric primary care in midtown Montgomery serving established and new patients.', null, 'free', null, null, 5)
ON CONFLICT (slug) DO NOTHING;

-- OBGYNS & WOMEN'S HEALTH
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, accepting_new_patients, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='womens-health'), 'central-alabama-obgyn', 'Central Alabama OB-GYN', '2100 E South Blvd', 'Montgomery', '36116', '(334) 288-2400', 'www.centralalabamaobgyn.com', 'Full-service obstetrics and gynecology with six providers serving the River Region. Delivers at Baptist Medical Center East.', '"The practice that delivered more River Region babies than any other. If you''re expecting and new in town, this is the call to make first." — longtime RRP advertiser.', 'featured', true, 'Mon-Fri 8am-5pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='womens-health'), 'montgomery-womens-health', 'Montgomery Women''s Health', '4270 Carmichael Rd, Suite 200', 'Montgomery', '36106', '(334) 272-1800', null, 'Women''s health services including OB, GYN, and midwifery options. Multiple providers, currently accepting new patients.', null, 'enhanced', true, 'Mon-Fri 8:30am-4:30pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='womens-health'), 'obgyn-associates', 'OB-GYN Associates of Montgomery', '1701 Halcyon Blvd', 'Montgomery', '36117', '(334) 272-0800', null, 'Established Montgomery OB-GYN practice with experienced providers and established obstetric care.', null, 'free', null, null, 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='womens-health'), 'physicians-for-women', 'Physicians for Women', '7900 Vaughn Rd, Suite 100', 'Montgomery', '36116', '(334) 284-0200', null, 'Women''s healthcare serving east Montgomery and Pike Road communities.', null, 'free', null, null, 4)
ON CONFLICT (slug) DO NOTHING;

-- DENTAL & ORTHODONTICS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, accepting_new_patients, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='dental-ortho'), 'dentistry-for-children', 'Dentistry for Children', '7915 Vaughn Rd, Suite A', 'Montgomery', '36116', '(334) 270-1440', 'www.dentistryforchildrenmontgomery.com', 'Pediatric dental specialists serving infants through teens. AAP recommends a first visit by age one — don''t wait.', '"My kids actually like going to the dentist. That should tell you everything." — RRP reader, three-time patient family.', 'featured', true, 'Mon-Thu 8am-5pm, Fri 8am-1pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='dental-ortho'), 'just-for-grins', 'Just for Grins Pediatric Dentistry & Orthodontics', '2041 E University Dr', 'Auburn', '36830', '(334) 826-6690', 'www.justforgrinsortho.com', 'Combined pediatric dental and orthodontic practice — convenient for families who want both specialties under one roof.', 'The combination of pediatric dentistry and orthodontics in one practice means continuity of care from first tooth to final retainer. Auburn families love this model.', 'enhanced', true, 'Mon-Fri 8am-5pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='dental-ortho'), 'chapman-orthodontics', 'Chapman Orthodontics', '7621 Eastchase Pkwy, Suite 111', 'Montgomery', '36117', '(334) 244-0770', 'www.chapmanorthodontics.com', 'Orthodontic specialists serving Montgomery and the River Region. Traditional braces and Invisalign for children and adults.', null, 'enhanced', null, 'Mon-Thu 8am-5pm', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='dental-ortho'), 'family-dental-group', 'River Region Family Dental', '420 N Memorial Dr', 'Prattville', '36067', '(334) 365-4200', null, 'General and family dentistry serving Prattville and northern Autauga County. All ages welcome.', null, 'free', null, null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='dental-ortho'), 'eastchase-dental', 'Eastchase Family Dentistry', '8100 Eastchase Pkwy', 'Montgomery', '36117', '(334) 270-0031', null, 'Comprehensive family dental care in east Montgomery. Pediatric services, cosmetic dentistry, and orthodontic referrals.', null, 'free', null, null, 5)
ON CONFLICT (slug) DO NOTHING;

-- URGENT CARE
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='urgent-care'), 'carespot-prattville', 'CareSpot Urgent Care — Prattville', '2003 S Memorial Dr', 'Prattville', '36066', '(334) 358-1009', 'www.carespot.com', 'Walk-in urgent care for ages 6 months and up. X-ray on-site, vaccinations, and laceration care. No appointment needed.', 'Save their number now. When your kid breaks a finger at soccer practice on a Tuesday evening, you will be glad you did. Typically a 20-minute wait or less — much faster than the ER for non-life-threatening situations.', 'featured', null, 'Mon-Fri 8am-8pm, Sat-Sun 9am-5pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='urgent-care'), 'americare-urgent-care', 'AmeriCare Urgent Care — Eastchase', '7900 Vaughn Rd', 'Montgomery', '36116', '(334) 213-4100', 'www.americareurgentcare.com', 'Walk-in urgent care in east Montgomery. Treating adults and children for illness, injuries, and minor emergencies.', null, 'free', 'Mon-Fri 8am-7pm, Sat 9am-4pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='urgent-care'), 'wetumpka-urgent-care', 'Wetumpka Urgent Care', '2390 E Coosa Dr', 'Wetumpka', '36092', '(334) 567-4200', null, 'Walk-in urgent care serving Wetumpka and Elmore County families. No appointment necessary.', null, 'free', 'Mon-Fri 8am-6pm', 3)
ON CONFLICT (slug) DO NOTHING;

-- WORSHIP
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'church-of-highlands-montgomery', 'Church of the Highlands — Eastchase Campus', '8025 Vaughn Rd', 'Montgomery', '36117', '(334) 387-0000', 'www.churchofthehighlands.com', 'Contemporary Christian church with robust children''s ministry and youth programs. Multiple service times on weekends.', '"I walked in not knowing a soul and had three new friends by the time my kids were picked up from kids church. That was our first Sunday." — River Region Parents reader.', 'featured', null, 'Sun 9am, 11am, 1pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'first-presbyterian-montgomery', 'First Presbyterian Church of Montgomery', '106 S Perry St', 'Montgomery', '36104', '(334) 834-8990', 'www.fpcmontgomery.org', 'Historic downtown congregation with active family ministry, Sunday school for all ages, and a beloved nursery program.', 'One of the most established congregations in Montgomery. Their Friday morning Mom''s Circle has helped more newcomer families find community than almost anything else in the city.', 'enhanced', null, 'Sun 9am, 11am', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'frazer-united-methodist', 'Frazer United Methodist Church', '6000 Atlanta Hwy', 'Montgomery', '36117', '(334) 272-8622', 'www.frazer.org', 'One of Alabama''s largest Methodist congregations with comprehensive children and youth programs, including a full weekday preschool.', null, 'enhanced', null, 'Sun 8:45am, 11am', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'trinity-episcopal', 'Trinity Episcopal Church', '400 S Perry St', 'Montgomery', '36104', '(334) 263-5735', 'www.trinitymontgomery.org', 'Historic downtown Episcopal parish with active family programming, youth group, and a beautiful campus.', null, 'free', null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'saint-bede-catholic', 'Saint Bede Catholic Church', '2323 Narrow Lane Rd', 'Montgomery', '36106', '(334) 272-5534', 'www.saintbedemontgomery.org', 'Catholic parish with active school, CCD, and family programming. Connected to Saint Bede School.', null, 'free', null, 5),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='worship'), 'eastchase-community-church', 'Eastchase Community Church', '8800 Vaughn Rd', 'Montgomery', '36117', '(334) 270-4455', null, 'Contemporary non-denominational church in east Montgomery. Active children''s ministry and young families group.', null, 'free', null, 6)
ON CONFLICT (slug) DO NOTHING;

-- TUTORING
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='tutoring'), 'mathnasium-prattville', 'Mathnasium of Prattville', '1873 Cobbs Ford Rd, Suite 130', 'Prattville', '36066', '(334) 358-5255', 'www.mathnasium.com/prattville', 'Math-only tutoring center using the proprietary Mathnasium method for grades 2-12. Free assessment to start.', '"My son went from failing pre-algebra to making the honor roll in one semester. The assessment told us exactly where the gaps were." — Prattville parent.', 'featured', null, 'Mon-Thu 3-8pm, Sat 9am-1pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='tutoring'), 'sylvan-learning-montgomery', 'Sylvan Learning Center — Montgomery', '7920 Vaughn Rd, Suite 500', 'Montgomery', '36116', '(334) 277-3555', 'www.sylvanlearning.com', 'Individualized tutoring for reading, math, writing, and test prep. Programs for K-12 with ongoing progress tracking.', 'Sylvan''s diagnostic-first approach works well for families new to the area who need a quick read on where their child stands academically after a mid-year school change.', 'enhanced', null, 'Mon-Thu 2-7pm, Sat 9am-1pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='tutoring'), 'kumon-montgomery', 'Kumon Math & Reading Center', '3775 Atlanta Hwy, Suite 4', 'Montgomery', '36109', '(334) 394-0080', 'www.kumon.com', 'Self-paced math and reading enrichment using the Kumon method. Daily independent practice builds foundational skills.', null, 'free', 'Mon, Wed 3-5:30pm, Sat 9am-11:30am', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='tutoring'), 'act-prep-river-region', 'River Region ACT/SAT Prep', '5445 Carmichael Rd', 'Montgomery', '36106', '(334) 409-7700', null, 'Intensive test preparation for high school students. Small-group and one-on-one sessions. Average score improvement: 4 points.', null, 'free', null, 4)
ON CONFLICT (slug) DO NOTHING;

-- SPORTS & ACTIVITIES
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='sports-activities'), 'montgomery-ymca', 'YMCA of Greater Montgomery', '1700 E South Blvd', 'Montgomery', '36116', '(334) 271-9622', 'www.ymcamontgomery.org', 'Full-facility YMCA with youth swim lessons, youth sports leagues, summer day camps, and drop-in childcare.', '"The Y is the single best investment a new family makes in this city. Youth swim lessons, soccer, basketball, summer camp — everything in one membership." — longtime member family.', 'featured', null, 'Mon-Fri 5am-10pm, Sat 7am-7pm, Sun 1-7pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='sports-activities'), 'competitive-edge-gymnastics', 'Competitive Edge Gymnastics', '3925 Atlanta Hwy', 'Montgomery', '36109', '(334) 271-4141', 'www.competitiveedgegymnastics.com', 'Recreational and competitive gymnastics for ages 18 months through high school. Tumbling, cheer, and ninja obstacle courses also offered.', 'The go-to gymnastics center for River Region families. Classes start as young as toddler age and the recreational program is a great first organized activity for young kids.', 'enhanced', null, 'Mon-Fri 9am-8pm, Sat 9am-2pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='sports-activities'), 'montgomery-river-region-soccer', 'Montgomery Area Soccer Association', 'Various fields', 'Montgomery', '36117', '(334) 272-4484', 'www.montgsoccer.com', 'Recreational and competitive soccer for ages 4-18. Spring and fall seasons. Largest youth soccer program in central Alabama.', null, 'enhanced', null, 'Registration: Jan (spring), Aug (fall)', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='sports-activities'), 'montgomery-area-swim', 'Montgomery Area Swim Association', '1700 E South Blvd', 'Montgomery', '36116', '(334) 288-0020', null, 'Competitive swim team for ages 6-18. Year-round and summer-only participation options available.', null, 'free', null, 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='sports-activities'), 'martial-arts-academy-montgomery', 'Martial Arts Academy of Montgomery', '7960 Vaughn Rd', 'Montgomery', '36116', '(334) 272-0404', null, 'Traditional and sport karate for children 4 and up. Character development, discipline, and self-defense focus.', null, 'free', null, 5)
ON CONFLICT (slug) DO NOTHING;

-- FAMILY ACTIVITIES
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='family-activities'), 'montgomery-zoo', 'Montgomery Zoo & Mann Wildlife Learning Museum', '2301 Coliseum Pkwy', 'Montgomery', '36110', '(334) 240-4900', 'www.montgomeryzoo.com', '40+ acres of wildlife, a petting zoo, zipline, and the free adjacent Mann Wildlife Museum. One of Alabama''s best family attractions.', '"The Montgomery Zoo is legitimately impressive — better than zoos in cities three times the size. Get the membership. You will go every month." — RRP subscriber family.', 'featured', null, 'Daily 9am-5pm (last entry 4pm)', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='family-activities'), 'splash-adventure-prattville', 'Splash Adventure Water Park', 'I-65 exit 164', 'Prattville', '36066', '(334) 361-9600', 'www.splashadventure.com', 'Alabama''s largest water park with slides, lazy river, wave pool, and kids'' areas. Seasonal Memorial Day through Labor Day.', 'The Prattville water park is the River Region''s summer answer to "I''m bored." Season passes pay for themselves in two visits.', 'enhanced', null, 'Memorial Day-Labor Day: daily 10am-6pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='family-activities'), 'montgomery-museum-fine-arts', 'Montgomery Museum of Fine Arts', '1 Museum Dr', 'Montgomery', '36117', '(334) 244-5700', 'www.mmfa.org', 'Free admission. American and European art, interactive ARTWORKS gallery for children, and rotating family programs.', null, 'free', 'Tue-Sat 10am-5pm, Sun 12-5pm', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='family-activities'), 'old-alabama-town', 'Old Alabama Town', '301 Columbus St', 'Montgomery', '36104', '(334) 240-4500', 'www.oldalabamatown.com', 'Sixteen-block living history site in downtown Montgomery. School field trip staple. Great for curious kids aged 5 and up.', null, 'free', 'Mon-Sat 9am-4pm', 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='family-activities'), 'montgomery-riverwalk-stadium', 'Riverwalk Stadium (Montgomery Biscuits)', '200 Coosa St', 'Montgomery', '36104', '(334) 323-2255', 'www.biscuitsbaseball.com', 'Double-A baseball from the Montgomery Biscuits — affordable family entertainment with fireworks nights, giveaways, and a kids'' play area in right field.', null, 'free', 'Season: April-September', 5)
ON CONFLICT (slug) DO NOTHING;

-- RESTAURANTS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='restaurants'), 'jubilee-seafood', 'Jubilee Seafood', '1057 Woodley Rd', 'Montgomery', '36106', '(334) 262-6224', null, 'Montgomery''s classic family seafood restaurant. Family-friendly, affordable, and consistently packed on Friday nights.', '"You''re not from here until you''ve had the Jubilee combo plate. Take out-of-town guests here before anywhere else." — DeAnne Watson, RRP Editor.', 'featured', null, 'Mon-Sat 11am-9pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='restaurants'), 'chris-hot-dogs', 'Chris'' Hot Dogs', '138 Dexter Ave', 'Montgomery', '36104', '(334) 265-6850', null, 'Downtown landmark since 1917. A River Region institution and the first place to take newcomers who want to understand the city.', '"It''s not just a hot dog. It''s a crash course in Montgomery." — longtime RRP reader.', 'enhanced', null, 'Mon-Sat 10am-5pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='restaurants'), 'farmers-merchants-montgomery', 'Farmers & Merchants', '7671 Eastchase Pkwy', 'Montgomery', '36117', '(334) 244-0799', null, 'Farm-to-table family restaurant in Eastchase serving breakfast, lunch, and dinner. Kids'' menu, family-friendly atmosphere.', null, 'enhanced', null, 'Mon-Sun 7am-9pm', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='restaurants'), 'vintage-year', 'The Vintage Year', '405 Cloverdale Rd', 'Montgomery', '36106', '(334) 264-8463', 'www.thevintageyear.com', 'Fine dining in the Cloverdale neighborhood — perfect for special occasions and when grandparents visit.', null, 'free', 'Tue-Sat 5-10pm', 4),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='restaurants'), 'chuys-montgomery', 'Chuy''s Mexican Food', '7825 Vaughn Rd', 'Montgomery', '36116', '(334) 271-3400', 'www.chuys.com', 'Casual Tex-Mex with the legendary Hatch green chile sauce. Family-friendly, kids eat free Monday nights.', null, 'free', 'Sun-Thu 11am-10pm, Fri-Sat 11am-11pm', 5)
ON CONFLICT (slug) DO NOTHING;

-- FARMER'S MARKETS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, hours_summary, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='farmers-markets'), 'montgomery-curb-market', 'Montgomery Curb Market', '1004 Madison Ave', 'Montgomery', '36104', '(334) 264-4731', null, 'Open since 1939. Fresh produce, plants, homemade preserves, baked goods, and local vendors in the heart of Montgomery.', '"When you say ''I''m running to the Curb Market,'' people know what you mean. It''s not just a market — it''s a River Region institution that''s been feeding families for 80 years." — RRP reader.', 'featured', null, 'Tue, Thu, Sat 5:30am-1pm', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='farmers-markets'), 'prattville-farmers-market', 'Prattville Farmers Market', 'Main Street Prattville', 'Prattville', '36067', null, null, 'Seasonal Saturday morning market in downtown Prattville. Local produce, honey, and artisan goods.', null, 'free', 'May-Oct: Sat 7am-12pm', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='farmers-markets'), 'pike-road-farm-stand', 'Pike Road Farmers Market', 'Pike Road Town Center', 'Pike Road', '36064', null, null, 'Community market in the Pike Road area — produce, eggs, jams, and seasonal local goods.', null, 'free', 'Sat 8am-12pm (seasonal)', 3)
ON CONFLICT (slug) DO NOTHING;

-- REAL ESTATE
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='real-estate'), 'river-region-relocation-era', 'River Region Relocation Team — ERA King Real Estate', '7940 Vaughn Rd, Suite 100', 'Montgomery', '36116', '(334) 271-9500', 'www.erakingmontgomery.com', 'Relocation specialists with deep knowledge of every neighborhood, school zone, and commute corridor in the River Region.', '"Our agent knew which side of every subdivision had the best school assignment. That saved us from making the wrong decision twice." — relocating military family, Fort Novosel area.', 'featured', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='real-estate'), 'realtors-who-care-remax', 'Realtors Who Care — ReMax', '4148 Carmichael Rd', 'Montgomery', '36106', '(334) 272-4999', 'www.remaxalabama.com', 'ReMax agents specializing in family relocations, military moves, and buyers navigating the River Region for the first time.', 'Especially helpful for families coming from out-of-state who need someone to help them understand the River Region''s neighborhoods and school district boundaries before they buy.', 'enhanced', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='real-estate'), 'keller-williams-montgomery', 'Montgomery Home Advisors — Keller Williams', '7815 Vaughn Rd', 'Montgomery', '36116', '(334) 481-2000', 'www.kwmontgomery.com', 'Full-service real estate with relocation-certified agents serving buyers throughout the River Region metro.', null, 'enhanced', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='real-estate'), 'alahomes-realty', 'AlaHomes Realty', '5425 Atlanta Hwy', 'Montgomery', '36109', '(334) 277-1200', null, 'Independent real estate serving first-time buyers, relocation, and investment properties across central Alabama.', null, 'free', 4)
ON CONFLICT (slug) DO NOTHING;

-- PHOTOGRAPHERS
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='photographers'), 'cassidy-rose-photography', 'Cassidy Rose Photography', 'Montgomery (Studio + Outdoor)', '36117', '(334) 517-0920', 'www.cassidyrosephotos.com', 'Portrait photography specializing in families, newborns, and milestones. Outdoor sessions at River Region locations.', '"She photographed all five of my kids at different ages and somehow captured each of their personalities perfectly. Worth every dollar." — longtime RRP reader.', 'featured', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='photographers'), 'sweetwater-portraits', 'Sweetwater Portraits', 'Montgomery Area', '36117', '(334) 318-4400', null, 'Lifestyle family photography in homes, parks, and outdoor River Region locations. Specializes in natural, relaxed sessions.', null, 'free', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='photographers'), 'river-region-family-photos', 'River Region Family Photos', 'Montgomery & Prattville', '36066', '(334) 412-8800', null, 'Affordable outdoor portrait sessions for families of all sizes. Mini-session events offered seasonally.', null, 'free', 3)
ON CONFLICT (slug) DO NOTHING;

-- MEDIA
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, listing_tier, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='media'), 'river-region-parents-rrp', 'River Region Parents Magazine', 'Montgomery, AL', '36116', '(334) 328-5189', 'www.riverregionparents.com', 'The River Region''s family magazine — in print monthly and online at riverregionparents.com. The guide you''re reading right now.', 'free', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='media'), 'montgomery-advertiser', 'Montgomery Advertiser', '425 Molton St', 'Montgomery', '36104', '(334) 265-7441', 'www.montgomeryadvertiser.com', 'Daily newspaper serving Montgomery and central Alabama. Local news, sports, and community coverage.', 'free', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='media'), 'wsfa-news-12', 'WSFA News 12', '1 News Plaza', 'Montgomery', '36101', '(334) 288-1212', 'www.wsfa.com', 'NBC affiliate providing local news, weather, and community coverage for central Alabama.', 'free', 3)
ON CONFLICT (slug) DO NOTHING;

-- VENUES
INSERT INTO guide_listings (category_id, slug, business_name, address, city, zip, phone, website, description, editorial_blurb, listing_tier, display_order) VALUES
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='venues'), 'barn-at-cahoots-farm', 'The Barn at Cahoots Farm', '2200 Cahoots Farm Rd', 'Millbrook', '36054', '(334) 285-8800', 'www.cahootsfarm.com', 'Rustic barn venue in Millbrook with indoor and outdoor space. Popular for weddings, rehearsal dinners, and large family celebrations.', '"We''ve hosted every family reunion and graduation party here for six years. There''s nowhere else like it in the River Region." — longtime Millbrook family.', 'featured', 1),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='venues'), 'vintage-venue-montgomery', 'Vintage Venue Montgomery', '1902 E Second St', 'Montgomery', '36106', '(334) 517-2200', 'www.vintagevenuemontgomery.com', 'Urban event venue in historic midtown Montgomery. Versatile indoor space for weddings, corporate events, and family celebrations.', 'A beautifully restored historic building that works equally well for an intimate rehearsal dinner or a 200-person reception. The photo backdrop alone is worth a look.', 'enhanced', 2),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='venues'), 'rsa-activity-center', 'RSA Activity Center', '201 Dexter Ave', 'Montgomery', '36104', '(334) 517-7700', 'www.rsa-al.gov', 'State-owned event center in downtown Montgomery with flexible ballroom and meeting spaces. Accessible and well-maintained.', null, 'free', 3),
((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug='venues'), 'alabama-shakespeare-festival-venue', 'Alabama Shakespeare Festival — Event Spaces', '1 Festival Dr', 'Montgomery', '36117', '(334) 271-5353', 'www.asf.net', 'The ASF campus offers stunning outdoor grounds and indoor spaces for events — with the backdrop of one of the most beautiful buildings in Alabama.', null, 'free', 4)
ON CONFLICT (slug) DO NOTHING;

-- ── ARTICLES ─────────────────────────────────────────────────────────────────
-- Three P0 editorial articles in warm River Region Parents voice
-- Body uses simple markdown (## headers, ** bold, - bullets, paragraph breaks)

INSERT INTO guide_articles (guide_slug, publication_id, slug, title, excerpt, body, author_name, author_byline, priority, display_order, published, published_at) VALUES
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev='RRP'),
  'choosing-school-district',
  'Choosing the Right School District in the River Region',
  'The single biggest decision a relocating family makes isn''t which house to buy — it''s which school their children will attend. The River Region gives you more choices than most families expect, and more ways to get it wrong if you don''t know the landscape.',
  '## The Decision Most Families Don''t Plan For

Here is something most relocation guides won''t tell you: families in the River Region regularly move twice. The first time, they pick a neighborhood based on square footage, commute, and price. A year later, after a frustrating school year, they move again — this time based on the school.

Save yourself the move. Start with the school.

The River Region has four public school districts, dozens of private and faith-based options, and a growing constellation of charter, magnet, and specialized programs. That''s actually good news for families who do their homework before signing a lease or a closing disclosure.

## The Public School Districts

**Montgomery Public Schools (MPS)** is the city''s largest district, serving more than 28,000 students across 55 schools. MPS has struggled with achievement gaps and budget pressures in recent years, but it also has genuine strengths: a robust magnet school program, career academies, and dual-enrollment partnerships with Trenholm State Community College. Families who engage with the magnet system — especially the performing arts and STEM programs — tend to be satisfied. Families who don''t often aren''t.

**Autauga County Schools** serves Prattville, Billingsley, and surrounding communities and consistently ranks among Alabama''s stronger rural districts. The schools are newer, class sizes are manageable, and the graduation rate is solid. Prattville High''s athletic programs have developed a strong community following. If you''re considering Prattville for its family-friendly neighborhoods, the schools reinforce that choice.

**Elmore County Schools** covers Wetumpka, Millbrook, and Tallassee. Millbrook Elementary and Wetumpka High are the most-talked-about schools in the district — and both punch above their weight. Families in Millbrook especially love the community feel: small enough that teachers know every kid, large enough to have competitive sports and strong extracurriculars. Wetumpka High''s drama program has produced alumni who went on to professional theater; it''s that good.

**Pike Road Schools** is the new favorite among families who want public school quality without private school tuition. The district is small, the facilities are newer, and the culture is deliberately community-centered. Class sizes are intentionally kept low. If you''re looking in Pike Road, the schools are a genuine selling point — not just a consolation prize.

## The Private School Landscape

The River Region has more private school options per capita than you might expect from a mid-sized Southern city. **Saint James School** on Vaughn Road is the largest and most academically comprehensive, with a K-12 program and a full NCAA athletics offering. **Trinity Presbyterian** on Narrow Lane offers classical Christian education for families who want a more traditional academic approach. **Montgomery Catholic**, **Alabama Christian**, **Macon East Academy**, and **Evangel Christian** each serve different communities and traditions.

Most private schools have wait lists at certain grade levels, and admissions timelines vary. If you''re considering private school, start the inquiry process before you finalize your move — some applications open in October for the following fall.

## Questions to Ask on Any School Visit

When you tour a school — public or private — here are the questions that actually tell you what you need to know:

- **What does a typical Wednesday afternoon look like?** This reveals extracurricular culture, teacher retention, and pace of life at the school.
- **How do you communicate with parents?** You want to know whether you''ll hear about problems before they become crises.
- **What happens when a student is significantly ahead or behind grade level?** The answer tells you whether differentiation is policy or wishful thinking.
- **Who can I talk to besides the admissions coordinator?** Ask to speak to a parent volunteer or a current family. Real schools welcome this.
- **What''s the one thing about this school that doesn''t show up in a brochure?** The answer to this question tells you whether the school is honest about itself.

## A Note on Timing

Most public district enrollment opens in February for the following fall. Private school applications typically open in October. If you are relocating mid-year, contact districts directly — most have straightforward mid-year enrollment processes, and public schools are required to enroll your child promptly.

The sooner you start this conversation, the more options you have. The families who feel frustrated about school choice in the River Region are almost always the ones who decided on a house first.',
  'River Region Parents',
  'Compiled by the RRP Editorial Team from conversations with River Region families, educators, and school administrators.',
  'p0',
  1,
  true,
  NOW()
),
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev='RRP'),
  'establishing-pediatric-care',
  'Establishing Pediatric Care When You''re New to Town',
  'Your child''s vaccine schedule doesn''t pause because you moved. Most families don''t realize how long it takes to get established with a new pediatrician — and the families who figure this out in week one are glad they did.',
  '## Don''t Wait on This One

Of all the things on your first-month checklist, establishing pediatric care is the one that has a hard deadline — and it''s the one most families put off.

Vaccine schedules are timed. Sick visits happen without warning. Developmental screenings need continuity of care. And in the River Region, the best pediatric practices regularly have wait times of four to six weeks for new-patient appointments — sometimes longer.

Call the week you move in. Not after you''ve unpacked. Not after the kids start school. The week you move in.

## Choosing a Pediatrician: What Actually Matters

**Same-day sick visit availability** is the single most important factor most families don''t ask about until they desperately need it. A beautiful office and a friendly staff don''t mean much when your child has a 104-degree fever at 7:45am on a Monday and the practice can''t see them until Thursday.

Ask directly: "If my child is sick on a Tuesday morning, what is the realistic expectation for being seen that day?" A good practice will give you a straight answer.

**Practice size** is a real tradeoff. Larger practices tend to have more flexible scheduling and more after-hours options. Smaller practices often have more consistent provider relationships — your child sees the same doctor 90% of the time instead of rotating through a team of six. Neither is universally better, but knowing which model you prefer helps narrow the search.

**After-hours coverage** matters more in Alabama than in many states because after-hours pediatric urgent care is limited. Most pediatric practices have an on-call system — know what yours is before you need it.

**Insurance network** should be confirmed before your first appointment, not after your first bill. Relocating families sometimes come in on TRICARE, Blue Cross, or out-of-state plans that require verification. The practice''s front desk can confirm coverage in five minutes — do it before booking.

## Pediatric Dental Care: Earlier Than You Think

The American Academy of Pediatrics recommends a child''s first dental visit by age one — or within six months of the first tooth. Most families don''t know this. Most kids in the River Region first see a dentist at age three or four, which is already late by AAP standards.

The good news: pediatric dentists in the area are genuinely good with anxious young patients. The first visit is typically a "lap exam" — your child sits in your lap, the dentist does a quick look, and the visit ends with a new toothbrush and a sticker. It is designed to be low-stakes.

The bad news: pediatric dental practices also have wait times for new patients. Call early.

**Pediatric dentist versus family dentist for kids** is a real choice. Pediatric dentists complete two to three years of additional training specifically in child development and behavior management. For toddlers and children with anxiety, the difference in experience is meaningful. For calm, cooperative school-age kids, a family dentist who is good with children works fine.

## Orthodontic Timing

Orthodontic evaluation typically begins around age seven to nine — not because braces start then, but because early evaluation identifies whether intervention is needed and when. A seven-year-old who gets a quick ortho consult might not start treatment until twelve. But a twelve-year-old whose parents waited until twelve starts without the benefit of early planning.

The takeaway: if your child is in that seven-to-nine window, add an orthodontic consultation to your first-year medical checklist.

## Pediatric Specialists: What''s Local, What Requires Travel

For common pediatric specialty needs — ENT, dermatology, and general pediatric surgery — the River Region is reasonably well-served. For pediatric subspecialties (pediatric cardiology, neurology, oncology, complex gastroenterology), Birmingham is typically the right answer, and most River Region pediatricians have established referral relationships with Children''s of Alabama.

This isn''t a gap — it''s how regional medicine works. The key is having a strong local pediatrician who knows when to refer and has a fast track to get you in.

## The Practical Checklist

In your first two weeks in the River Region:

- **Call two or three pediatric practices** — ask about new patient availability, call-in sick protocol, and insurance acceptance. You don''t have to decide immediately; just get on their schedule.
- **Transfer medical records** — call your previous practice and ask them to forward records to your new provider. This is standard and usually takes a few days.
- **Locate the nearest urgent care** that sees children under 2, in case you need it before your first appointment comes through.
- **Note your nearest emergency department** — Baptist Medical Center East has a strong pediatric ER and is the first choice for most families in east Montgomery and the eastern suburbs.

One more thing: the families who feel most prepared in their first River Region winter are the ones who have an established pediatrician before October. Sick season is real here, and you want a physician who knows your child before the first fever hits.',
  'River Region Parents',
  'Written in partnership with River Region pediatric health professionals.',
  'p0',
  2,
  true,
  NOW()
),
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev='RRP'),
  'where-to-find-your-people',
  'Where to Find Your People: A Newcomer''s Guide to Community',
  'The number one regret newcomer families share isn''t about the neighborhood they chose or the house they bought. It''s this: "I wish I''d found my people sooner."',
  '## The Thing Nobody Tells You

Moving is logistically hard. Boxes, utilities, school registration, address changes — that part of it is just work, and work gets done. The harder part, the part nobody puts on a checklist, is the loneliness that shows up around week three.

The boxes are unpacked. The kids are in school. You know where the grocery store is. And yet you somehow feel more invisible than you''ve felt since college.

This is normal. It is also temporary — if you do something about it.

The families who find their rhythm fastest in the River Region are not the ones who wait for community to find them. They''re the ones who show up somewhere, even awkwardly, before they feel ready. Here is where to start.

## Mom''s Groups and Parent Support

**MOPS (Mothers of Preschoolers)** chapters exist in several River Region churches and are one of the fastest ways to meet other mothers with young children. You don''t need to be a member of the host church. You just have to show up. Local chapters meet monthly during the school year, and the format — small-group discussion, childcare provided, coffee — is designed for exactly the situation you''re in.

**MOMS Club chapters** operate in the Prattville and east Montgomery areas as secular, volunteer-organized groups for at-home moms and work-from-home parents. Monthly play dates, park meetups, and the occasional evening out.

**Neighborhood Facebook groups** are, despite everything, genuinely useful in the River Region. They''re how you find the handyman everyone actually uses, which neighborhoods have trick-or-treating worth driving to, and who the real estate agents are that know the area. They''re also how newcomers ask questions without feeling embarrassed. People in River Region groups are notably welcoming to that "just moved here" post.

## Faith Communities for Families

If you have any inclination toward a faith community, finding one early pays dividends far beyond Sunday morning. Church small groups and mid-week programs are the primary way that River Region adults — especially parents — build lasting friendships. The social infrastructure of a good church is real.

A few honest notes on finding one:

- **Try at least three before deciding** — most families who feel "it didn''t work" stopped after one. Sunday morning is a big-church performance. Small groups and Wednesday night programs are where community actually lives.
- **Look for kids'' programming** — not because your kids need it immediately, but because parents who are in the nursery or kids'' wing together start talking. That''s where the friendships form.
- **Prattville families** tend toward Autauga County churches (First Baptist Prattville, First Presbyterian Prattville) and Pike Road Community Church — each has active family programming.
- **East Montgomery and Eastchase families** find community at Church of the Highlands (large, contemporary), Frazer UMC (historic, comprehensive), and the east campus of several downtown churches.

## Sports and Activities by Season

Youth sports are one of the most reliable entry points for newcomer families — for kids and parents both.

**Fall** is football (not just watching — youth leagues across all ages) and soccer season. Montgomery Area Soccer Association''s fall recreational season is the easiest entry point: registration opens in August, games start in September, and the parent sidelines on Saturday mornings have genuine community.

**Winter** is basketball season. Most YMCA and Parks & Rec leagues run December through February. Indoor, organized, and a good option for energy-surplus children.

**Spring** brings baseball and softball back, along with the end of soccer season. Spring soccer tends to have more experienced players and more competitive options.

**Year-round**: gymnastics, martial arts, dance, and swim lessons run continuously. If your child''s activity doesn''t have a season, it often has a community — families at the same gym or studio tend to know each other well.

## Volunteer and Service Opportunities

This one surprises newcomer families, but it works: family volunteering is genuinely one of the best ways to meet people and feel rooted quickly. When you serve somewhere together, you stop being a newcomer. You become a member.

**Family Sunshine Center** serves families of children with disabilities — they have family-friendly volunteer events and a warmly welcoming community.

**Hands On River Region** is a clearinghouse for volunteer opportunities across the city. The website lets you browse by date, cause, and whether it''s family-friendly.

**Common Ground Montgomery** and **Saint Vincent de Paul** are downtown-based service organizations with active volunteer communities.

Church-based service projects are another natural entry point — most congregations with families have quarterly service days that are open to non-members.

## One Last Thing

The families who find their people fastest in the River Region are not the ones who wait until they feel settled. They''re the ones who go somewhere before they feel ready. The first time is always a little awkward. The second time is usually not.

The River Region is a place where people stay. Families who move here for a job end up staying for twenty years. The community is there. You just have to show up.',
  'River Region Parents',
  'Contributed by RRP readers who moved to the River Region in the past three years, with thanks to Sarah Lyons for the original "Finding Your Crew" piece.',
  'p0',
  3,
  true,
  NOW()
)
ON CONFLICT (guide_slug, slug) DO NOTHING;
